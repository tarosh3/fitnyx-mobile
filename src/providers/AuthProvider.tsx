import type { User } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { saveMetric } from '@/src/lib/api';
import { clearSessionId, getSessionId, registerSession } from '@/src/lib/api/auth';
import { getOnboardingStatus } from '@/src/lib/api/onboarding';
import { getProfile } from '@/src/lib/api/users';
import { cacheClear, cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { clearOfflineQueue, getOfflineQueue } from '@/src/lib/cache/indexeddb';
import { processOfflineQueue } from '@/src/lib/offline/syncEngine';
import { supabase } from '@/src/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuth: (mode: 'login' | 'signup') => void;
  closeAuth: () => void;
  isAuthOpen: boolean;
  authMode: 'login' | 'signup';
  onboardingComplete: boolean;
  avatarUrl: string | null;
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

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const checkOnboarding = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setOnboardingComplete(false);
      return false;
    }

    const cacheKey = cacheKeys.onboardingStatus(currentUser.id);
    const cached = await cacheGet<{ complete: boolean }>(cacheKey);

    if (cached !== null) {
      setOnboardingComplete(cached.complete);
      getOnboardingStatus()
        .then((status) => {
          setOnboardingComplete(status.onboarding_complete);
          cacheSet(cacheKey, { complete: status.onboarding_complete }, cacheTTL.MEDIUM);
        })
        .catch(() => undefined);
      return cached.complete;
    }

    try {
      const status = await getOnboardingStatus();
      setOnboardingComplete(status.onboarding_complete);
      await cacheSet(cacheKey, { complete: status.onboarding_complete }, cacheTTL.MEDIUM);
      return status.onboarding_complete;
    } catch {
      setOnboardingComplete(false);
      return false;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const cacheKey = cacheKeys.userProfile(userId);
    const cached = await cacheGet<{ avatar_url?: string }>(cacheKey);

    if (cached) {
      setAvatarUrl(cached.avatar_url ?? null);
      getProfile()
        .then((profile) => {
          setAvatarUrl(profile.avatar_url ?? null);
          cacheSet(cacheKey, profile, cacheTTL.DAY);
        })
        .catch(() => undefined);
      return;
    }

    try {
      const profile = await getProfile();
      setAvatarUrl(profile.avatar_url ?? null);
      cacheSet(cacheKey, profile, cacheTTL.DAY);
    } catch (error) {
      console.error('Failed to load profile', error);
    }
  };

  // Redirect to onboarding if needed (reacts to path changes)
  useEffect(() => {
    if (!loading && user && !onboardingComplete && !ONBOARDING_EXEMPT_PATHS.includes(pathname)) {
      router.replace('/onboarding');
    }
  }, [pathname, loading, user, onboardingComplete]);

  // Initialize auth and listen for state changes (runs once)
  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser && session?.access_token) {
          // Session registration is handled by onAuthStateChange (which
          // receives a fresh token). Attempting it here with a potentially
          // expired cached token causes "Access token is required" errors.
          fetchUserProfile(currentUser.id);
          await checkOnboarding(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setOnboardingComplete(false);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setLoading(true);
        try {
          // Register device session on sign-in (enforces single-device login).
          // Also register on TOKEN_REFRESHED if no session ID exists yet
          // (covers cold start where init skips registration).
          const needsRegistration =
            event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && !(await getSessionId()));
          if (needsRegistration) {
            try {
              await registerSession(session?.access_token);
            } catch (e) {
              console.warn('Failed to register session:', e);
            }
          }
          fetchUserProfile(currentUser.id);
          await checkOnboarding(currentUser);
        } finally {
          setLoading(false);
        }
      } else {
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
        console.error('Offline sync failed', error);
      }
    };

    syncOffline();
  }, [isOnline, user]);

  const signOut = async () => {
    await clearSessionId();
    await cacheClear();
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
      avatarUrl,
    }),
    [user, loading, onboardingComplete, avatarUrl, isAuthOpen, authMode]
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
