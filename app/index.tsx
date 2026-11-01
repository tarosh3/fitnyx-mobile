import React from 'react';

import { BrandLoader } from '@/src/components/ui/BrandLoader';
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
        {/* Same loader as onboarding, so the hand-off there doesn't swap spinners. */}
        <BrandLoader size="large" color={palette.accent} />
      </Screen>
    );
  }

  if (user) {
    return <MobileHome user={user} avatarUrl={avatarUrl} userProfile={userProfile} />;
  }

  return <AuthLanding />;
}
