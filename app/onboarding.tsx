import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/src/providers/AuthProvider';
import { getOnboardingStatus } from '@/src/lib/api/onboarding';
import { OnboardingFlow } from '@/src/features/onboarding/OnboardingFlow';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function OnboardingScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        router.replace('/');
        return;
      }

      try {
        const status = await getOnboardingStatus();
        if (status.onboarding_complete) {
          router.replace('/dashboard');
          return;
        }
      } catch {
        // continue to onboarding
      }

      setChecking(false);
    };

    if (!authLoading) {
      checkStatus();
    }
  }, [authLoading, user, router]);

  if (authLoading || checking) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return <OnboardingFlow />;
}
