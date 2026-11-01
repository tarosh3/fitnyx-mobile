import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { useAuth } from '@/src/providers/AuthProvider';
import { getOnboardingStatus } from '@/src/lib/api/onboarding';
import { OnboardingFlow } from '@/src/features/onboarding/OnboardingFlow';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function OnboardingScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { user, loading: authLoading } = useAuth();

  // The flow renders straight away; this only sends an already-onboarded user
  // home. Blocking on it put an extra spinner screen between sign-in and the
  // first step (a flash of a different screen, reported 2026-11-01).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    getOnboardingStatus()
      .then((status) => {
        if (!cancelled && status.onboarding_complete) router.replace('/');
      })
      .catch(() => undefined); // continue to onboarding
    return () => { cancelled = true; };
  }, [authLoading, user?.id, router]);

  // Keep the flow mounted once there is a user: a SIGNED_IN / TOKEN_REFRESHED
  // flips authLoading, and unmounting here would drop the answers on screen.
  if (!user) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center' }}>
        {authLoading ? <BrandLoader color={palette.accent} size="large" /> : null}
      </View>
    );
  }

  return <OnboardingFlow />;
}
