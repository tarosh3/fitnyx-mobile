import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import type { User } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { _registerAuthFailureHandler, isAuthError, isInviteGateError, saveMetric } from '@/src/lib/api';
import { clearSessionId, getSessionId, registerSession } from '@/src/lib/api/auth';
import { getOnboardingStatus } from '@/src/lib/api/onboarding';
import { getProfile, type UserProfile } from '@/src/lib/api/users';
import { cacheClear, cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { clearOfflineQueue, getOfflineQueue } from '@/src/lib/cache/indexeddb';
import { clearAllOfflineData } from '@/src/lib/offline/offlineStore';
import { clearAllReminders } from '@/src/lib/reminders';
import { clearAllWaterData } from '@/src/lib/water';
import { processOfflineQueue } from '@/src/lib/offline/syncEngine';
import { supabase } from '@/src/lib/supabase';

// Durable key that persists indefinitely (not subject to TTL expiry)
const ONBOARDING_DONE_KEY = 'fitnyx:onboarding-complete';

// Outcome of backend session registration: 'ok' also covers already-registered;
// the invite states park the user on the gate screens.
type GateStatus = 'ok' | 'failed' | 'invite_required' | 'invite_expired';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuth: (mode: 'login' | 'signup') => void;
  closeAuth: () => void;
  isAuthOpen: boolean;
  authMode: 'login' | 'signup';
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;
  avatarUrl: string | null;
  userProfile: UserProfile | null;
  /** Called by the invite screens after a successful redeem + re-registration. */
  onInviteRedeemed: () => Promise<void>;
}

const ONBOARDING_EXEMPT_PATHS = [
  '/onboarding',
  '/auth/callback',
  '/email-verified',
  '/update-password',
  '/verification-failed',
  '/privacy-policy',
  '/terms-of-service',
  '/delete-account',
  '/login',
  '/signup',
  '/invite',
  '/access-expired',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Non-null while the backend refuses a session pending invite redemption.
  // Drives the re-park effect below so the user can't wander off the gate
  // screens (hardware back, deep links, stale nav history).
  const [inviteGate, setInviteGate] = useState<'invite_required' | 'invite_expired' | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const checkOnboarding = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setOnboardingComplete(false);
      return false;
    }

    // 1. Check durable (permanent) AsyncStorage flag first — survives TTL expiry
    const durableKey = `${ONBOARDING_DONE_KEY}:${currentUser.id}`;
    const durableValue = await AsyncStorage.getItem(durableKey).catch(() => null);
    const durableComplete = durableValue === 'true';

    // 2. Check TTL cache (fast, in-memory + AsyncStorage)
    const cacheKey = cacheKeys.onboardingStatus(currentUser.id);
    const cached = await cacheGet<{ complete: boolean }>(cacheKey);

    if (cached !== null) {
      setOnboardingComplete(cached.complete);
      // Background refresh
      getOnboardingStatus()
        .then((status) => {
          setOnboardingComplete(status.onboarding_complete);
          cacheSet(cacheKey, { complete: status.onboarding_complete }, cacheTTL.MEDIUM);
          if (status.onboarding_complete) {
            AsyncStorage.setItem(durableKey, 'true').catch(() => undefined);
          }
        })
        .catch(() => undefined);
      return cached.complete;
    }

    // 3. Try the API
    try {
      const status = await getOnboardingStatus();
      setOnboardingComplete(status.onboarding_complete);
      await cacheSet(cacheKey, { complete: status.onboarding_complete }, cacheTTL.MEDIUM);
      if (status.onboarding_complete) {
        await AsyncStorage.setItem(durableKey, 'true').catch(() => undefined);
      }
      return status.onboarding_complete;
    } catch {
      // 4. API failed (offline / server down) — trust the durable flag.
      //    Only truly new users (no durable flag) will see onboarding.
      setOnboardingComplete(durableComplete);
      return durableComplete;
    }
  };

  const applyProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setAvatarUrl(profile.avatar_url ?? null);
  };

  const fetchUserProfile = async (userId: string) => {
    const cacheKey = cacheKeys.userProfile(userId);
    const cached = await cacheGet<UserProfile>(cacheKey);

    if (cached) {
      applyProfile(cached);
      getProfile()
        .then((profile) => {
          applyProfile(profile);
          cacheSet(cacheKey, profile, cacheTTL.DAY);
        })
        .catch(() => undefined);
      return;
    }

    try {
      const profile = await getProfile();
      applyProfile(profile);
      cacheSet(cacheKey, profile, cacheTTL.DAY);
    } catch (error) {
      if (isAuthError(error)) return; // signed out elsewhere — handled globally
      console.warn('Failed to load profile', error);
    }
  };

  // Redirect to onboarding if needed (reacts to path changes). Gated users are
  // excluded — the invite re-park effect owns their navigation.
  useEffect(() => {
    if (!loading && user && !inviteGate && !onboardingComplete && !ONBOARDING_EXEMPT_PATHS.includes(pathname)) {
      router.replace('/onboarding');
    }
  }, [pathname, loading, user, onboardingComplete, inviteGate]);

  // Pin gated users to their gate screen. Navigating only when the pathname
  // differs also prevents remount churn when TOKEN_REFRESHED re-triggers the
  // gate while the user is already parked (mid-typed code would be wiped).
  useEffect(() => {
    if (loading || !user || !inviteGate) return;
    const target = inviteGate === 'invite_expired' ? '/access-expired' : '/invite';
    if (pathname !== target) {
      router.replace(target);
    }
  }, [pathname, loading, user, inviteGate]);

  // Initialize auth and listen for state changes (runs once)
  // A single in-flight promise dedupes concurrent registerSession calls so
  // initialize() + onAuthStateChange (TOKEN_REFRESHED) can't both register
  // and end up with two backend sessions.
  const registrationInFlightRef = useRef<Promise<GateStatus> | null>(null);

  // Guards the global auth-failure handler so parallel 401s during boot drive
  // exactly one sign-out + redirect. Reset to false on each successful sign-in.
  const authFailureHandledRef = useRef(false);

  const ensureSessionRegistered = async (accessToken?: string | null): Promise<GateStatus> => {
    if (!accessToken) return 'failed';
    if (registrationInFlightRef.current) {
      return registrationInFlightRef.current;
    }
    const existing = await getSessionId();
    if (existing) return 'ok';

    const task = (async (): Promise<GateStatus> => {
      try {
        await registerSession(accessToken);
        return 'ok';
      } catch (e) {
        // Invite gate: the backend refuses a session until a code is redeemed
        // (or a fresh one, when access expired). Surfaced so callers route to
        // the gate screens instead of proceeding into 401 churn.
        if (isInviteGateError(e)) {
          return e.code === 'INVITE_EXPIRED' ? 'invite_expired' : 'invite_required';
        }
        console.warn('Session registration failed:', e);
        return 'failed';
      }
    })();
    registrationInFlightRef.current = task;
    try {
      return await task;
    } finally {
      registrationInFlightRef.current = null;
    }
  };

  // Shared handling for a gated registration: keep the Supabase user (their
  // JWT is required to redeem), skip profile/onboarding fetches (they would
  // just 401 against the missing backend session). Navigation happens in the
  // re-park effect, driven by the inviteGate state set here.
  const routeToGate = (gate: 'invite_required' | 'invite_expired', currentUser: User) => {
    Sentry.setUser({ id: currentUser.id });
    setUser(currentUser);
    setInviteGate(gate);
  };

  useEffect(() => {
    const isRefreshTokenError = (err: unknown): boolean => {
      const msg = (err as { message?: string })?.message ?? '';
      return (
        msg.includes('Invalid Refresh Token') ||
        msg.includes('Refresh Token Not Found') ||
        msg.includes('refresh_token_not_found') ||
        msg.includes('invalid_grant')
      );
    };

    const clearStaleSession = async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore — best-effort wipe
      }
      await clearSessionId().catch(() => undefined);
      // Forced sign-outs (revoked session, dead refresh token) must purge the
      // same local data as a manual sign-out — otherwise the next account on
      // this device inherits the previous user's caches, water log, reminders.
      await cacheClear().catch(() => undefined);
      await clearAllOfflineData().catch(() => undefined);
      await clearOfflineQueue().catch(() => undefined);
      await clearAllWaterData().catch(() => undefined);
      await clearAllReminders().catch(() => undefined);
    };

    const initialize = async () => {
      try {
        const {
          data: { session: storedSession },
          error: getError,
        } = await supabase.auth.getSession();

        if (getError) {
          if (isRefreshTokenError(getError)) {
            await clearStaleSession();
            setUser(null);
            router.replace('/login');
            return;
          }
          throw getError;
        }

        if (!storedSession) {
          setUser(null);
          return;
        }

        // Stored session exists. Verify the refresh token is still valid by
        // forcing a refresh now. If the token chain is broken, surface it
        // immediately rather than failing later inside every API call.
        const nowSec = Math.floor(Date.now() / 1000);
        const accessExpired = storedSession.expires_at ? storedSession.expires_at - nowSec < 60 : true;
        let workingSession = storedSession;
        if (accessExpired) {
          const { data: { session: refreshed }, error: refreshErr } =
            await supabase.auth.refreshSession();
          if (refreshErr || !refreshed) {
            await clearStaleSession();
            setUser(null);
            router.replace('/login');
            return;
          }
          workingSession = refreshed;
        }

        const currentUser = workingSession.user;
        const gate = await ensureSessionRegistered(workingSession.access_token);
        if (gate === 'invite_required' || gate === 'invite_expired') {
          routeToGate(gate, currentUser);
          return;
        }
        // id only — never send email to Sentry (privacy-label liability)
        Sentry.setUser({ id: currentUser.id });
        authFailureHandledRef.current = false; // fresh session — re-arm the failure handler
        setInviteGate(null);
        setUser(currentUser);
        fetchUserProfile(currentUser.id);
        await checkOnboarding(currentUser);
      } catch (error) {
        if (isRefreshTokenError(error)) {
          await clearStaleSession();
          setUser(null);
          router.replace('/login');
        } else {
          console.error('Auth check failed', error);
        }
      } finally {
        setLoading(false);
      }
    };

    // Allow deep modules (fetchWithAuth) to trigger forced sign-out when
    // they discover the session is gone or refresh has failed.
    _registerAuthFailureHandler((reason) => {
      // Only the first failure drives sign-out + redirect; parallel 401s during
      // boot would otherwise each clear state and re-navigate.
      if (authFailureHandledRef.current) return;
      authFailureHandledRef.current = true;

      // Invite gate reasons: do NOT sign out locally — the Supabase JWT is
      // exactly what the gate screens need to redeem a code. Setting the gate
      // state parks them via the re-park effect.
      if (reason === 'invite_required' || reason === 'invite_expired') {
        setInviteGate(reason);
        setLoading(false);
        return;
      }

      clearStaleSession().finally(() => {
        setUser(null);
        setOnboardingComplete(false);
        setAvatarUrl(null);
        setUserProfile(null);
        setLoading(false);
        router.replace(reason ? `/login?reason=${reason}` : '/login');
      });
    });

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is handled by initialize() above — skip it here
      // to avoid a race where setUser triggers child providers before
      // the backend session ID is registered.
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        Sentry.setUser(null);
        setUser(null);
        setInviteGate(null);
        setOnboardingComplete(false);
        setAvatarUrl(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;

      if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setLoading(true);
        try {
          const gate = await ensureSessionRegistered(session?.access_token);
          if (gate === 'invite_required' || gate === 'invite_expired') {
            routeToGate(gate, currentUser);
            return;
          }
          // id only — never send email to Sentry (privacy-label liability)
          Sentry.setUser({ id: currentUser.id });
          authFailureHandledRef.current = false; // fresh session — re-arm the failure handler
          setInviteGate(null);
          setUser(currentUser);
          fetchUserProfile(currentUser.id);
          await checkOnboarding(currentUser);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  useEffect(() => {
    const syncOffline = async () => {
      if (!user || !isOnline) return;

      try {
        const queue = await getOfflineQueue();
        if (!queue.length) return;

        const result = await processOfflineQueue();
        if (result.failed > 0) {
          console.warn(`Offline sync: ${result.processed} synced, ${result.failed} failed`);
        }
      } catch (error) {
        console.warn('Offline sync failed', error);
      }
    };

    syncOffline();
  }, [isOnline, user]);

  const signOut = async () => {
    // Clear durable onboarding flag for this user before wiping state
    if (user?.id) {
      await AsyncStorage.removeItem(`${ONBOARDING_DONE_KEY}:${user.id}`).catch(() => undefined);
    }
    await clearSessionId();
    await cacheClear();
    await clearAllOfflineData();
    await clearOfflineQueue();
    await clearAllWaterData().catch(() => undefined);
    await clearAllReminders().catch(() => undefined);
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/');
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
    router.push(mode === 'login' ? '/login' : '/signup');
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
  };

  const markOnboardingComplete = () => {
    setOnboardingComplete(true);
    if (user?.id) {
      const durableKey = `${ONBOARDING_DONE_KEY}:${user.id}`;
      AsyncStorage.setItem(durableKey, 'true').catch(() => undefined);
      const cacheKey = cacheKeys.onboardingStatus(user.id);
      cacheSet(cacheKey, { complete: true }, cacheTTL.MEDIUM).catch(() => undefined);
    }
  };

  // After the invite screens redeem a code and re-register the session:
  // clear the gate (so the re-park effect stands down), re-arm the failure
  // handler, load what the gate skipped, and enter the app.
  const onInviteRedeemed = async () => {
    setInviteGate(null);
    authFailureHandledRef.current = false;
    const currentUser = user;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    fetchUserProfile(currentUser.id);
    const complete = await checkOnboarding(currentUser);
    router.replace(complete ? '/dashboard' : '/onboarding');
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signOut,
      openAuth,
      closeAuth,
      isAuthOpen,
      authMode,
      onboardingComplete,
      markOnboardingComplete,
      avatarUrl,
      userProfile,
      onInviteRedeemed,
    }),
    [user, loading, onboardingComplete, avatarUrl, userProfile, isAuthOpen, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
