import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { MobileDashboard } from '@/src/features/dashboard/MobileDashboard';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

export default function DashboardScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { user, loading, avatarUrl } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <MobileDashboard user={user} avatarUrl={avatarUrl} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
});
