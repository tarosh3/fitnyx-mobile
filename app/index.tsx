import React from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { AuthLanding } from '@/src/features/auth/AuthLanding';
import { MobileHome } from '@/src/features/dashboard/MobileHome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

export default function HomeScreen() {
  const palette = useThemeColors();
  const { user, loading, avatarUrl } = useAuth();

  if (loading) {
    return (
      <Screen scroll={false} contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </Screen>
    );
  }

  if (user) {
    return (
      <Screen scroll={true}>
        <MobileHome user={user} avatarUrl={avatarUrl} />
      </Screen>
    );
  }

  return <AuthLanding />;
}
