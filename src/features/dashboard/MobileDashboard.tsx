import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { DashboardStats } from './components/DashboardStats';
import { ProfileHeader } from './components/ProfileHeader';
import { QuickActionsGrid } from './components/QuickActionsGrid';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchLatestMetric } from '@/src/lib/api';

const NEON_LIME = '#5fc793';

interface MobileDashboardProps {
  user: any;
  avatarUrl?: string | null;
}

export function MobileDashboard({ user, avatarUrl }: MobileDashboardProps) {
  const palette = useThemeColors();

  const { data: latestMetric, isLoading } = useQuery({
    queryKey: ['userMetrics', user?.id],
    queryFn: fetchLatestMetric,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev: any) => prev,
  });

  const userName = (user?.user_metadata?.username || user?.user_metadata?.first_name || 'Athlete');

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={NEON_LIME} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <ProfileHeader
          userName={userName}
          avatarUrl={avatarUrl}
          variant="dashboard"
        />

        <DashboardStats
          weight={latestMetric?.weight_kg ?? null}
          bmi={latestMetric?.weight_kg && latestMetric?.height_cm
            ? latestMetric.weight_kg / Math.pow(latestMetric.height_cm / 100, 2)
            : null}
          height={latestMetric?.height_cm ?? null}
        />

        <QuickActionsGrid />

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 12,
  },
});
