import React from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { AuthLanding } from '@/src/features/auth/AuthLanding';
import { MobileHome } from '@/src/features/dashboard/MobileHome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

export default function HomeScreen() {
  const palette = useThemeColors();
  const { user, loading, onboardingComplete, avatarUrl, userProfile } = useAuth();

  // A signed-in user who hasn't finished onboarding is about to be routed
  // to /onboarding (or an invite gate) by AuthProvider — rendering Home first
  // flashed it, nav bar included, right after Google sign-up.
  if (loading || (user && !onboardingComplete)) {
    return (
      <Screen scroll={false} contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </Screen>
    );
  }

  if (user) {
    return <MobileHome user={user} avatarUrl={avatarUrl} userProfile={userProfile} />;
  }

  return <AuthLanding />;
}
