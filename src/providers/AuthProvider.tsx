import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import type { User } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { _registerAuthFailureHandler, saveMetric } from '@/src/lib/api';
import { clearSessionId, getSessionId, registerSession } from '@/src/lib/api/auth';
import { getOnboardingStatus } from '@/src/lib/api/onboarding';
import { getProfile, type UserProfile } from '@/src/lib/api/users';
import { cacheClear, cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { clearOfflineQueue, getOfflineQueue } from '@/src/lib/cache/indexeddb';
import { clearAllOfflineData } from '@/src/lib/offline/offlineStore';
import { processOfflineQueue } from '@/src/lib/offline/syncEngine';
import { supabase } from '@/src/lib/supabase';

// Durable key that persists indefinitely (not subject to TTL expiry)
const ONBOARDING_DONE_KEY = 'fitnyx:onboarding-complete';

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
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      console.warn('Failed to load profile', error);
    }
  };

  // Redirect to onboarding if needed (reacts to path changes)
  useEffect(() => {
    if (!loading && user && !onboardingComplete && !ONBOARDING_EXEMPT_PATHS.includes(pathname)) {
      router.replace('/onboarding');
    }
  }, [pathname, loading, user, onboardingComplete]);

  // Initialize auth and listen for state changes (runs once)
  // A single in-flight promise dedupes concurrent registerSession calls so
  // initialize() + onAuthStateChange (TOKEN_REFRESHED) can't both register
  // and end up with two backend sessions.
  const registrationInFlightRef = useRef<Promise<void> | null>(null);

  const ensureSessionRegistered = async (accessToken?: string | null) => {
    if (!accessToken) return;
    if (registrationInFlightRef.current) {
      await registrationInFlightRef.current;
      return;
    }
    const existing = await getSessionId();
    if (existing) return;

    const task = (async () => {
      try {
        await registerSession(accessToken);
      } catch (e) {
        console.warn('Session registration failed:', e);
      }
    })();
    registrationInFlightRef.current = task;
    try {
      await task;
    } finally {
      registrationInFlightRef.current = null;
    }
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
        await ensureSessionRegistered(workingSession.access_token);
        Sentry.setUser({ id: currentUser.id, email: currentUser.email });
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
    _registerAuthFailureHandler(() => {
      clearStaleSession().finally(() => {
        setUser(null);
        setOnboardingComplete(false);
        setAvatarUrl(null);
        setUserProfile(null);
        setLoading(false);
        router.replace('/login');
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
          await ensureSessionRegistered(session?.access_token);
          Sentry.setUser({ id: currentUser.id, email: currentUser.email });
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
