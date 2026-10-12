import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { DashboardStats } from './components/DashboardStats';
import { ProfileHeader } from './components/ProfileHeader';
import { QuickActionsGrid } from './components/QuickActionsGrid';

import { RoamStatsCard } from '@/src/features/roam/components/RoamStatsCard';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchLatestMetric } from '@/src/lib/api';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import type { UserProfile } from '@/src/lib/api/users';

const NEON_LIME = '#5fc793';

interface MobileDashboardProps {
  user: any;
  avatarUrl?: string | null;
  userProfile?: UserProfile | null;
}

export function MobileDashboard({ user, avatarUrl, userProfile }: MobileDashboardProps) {
  const palette = useThemeColors();

  // Last-known body metric (shared with the Stats screen's cache) so the cards
  // show numbers at once — and offline, after the in-memory query is gone.
  const [stored, setStored] = useState<any>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    cacheGetStale(cacheKeys.bodyMetricsLatest(user.id)).then(setStored).catch(() => setStored(null));
  }, [user?.id]);

  const { data: fetchedMetric, isLoading } = useQuery({
    queryKey: ['userMetrics', user?.id],
    queryFn: async () => {
      const metric = await fetchLatestMetric();
      cacheSet(cacheKeys.bodyMetricsLatest(user.id), metric ?? null, cacheTTL.LONG).catch(() => undefined);
      return metric;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
  const latestMetric = fetchedMetric ?? stored;

  const userName = (userProfile?.first_name || userProfile?.username || user?.user_metadata?.first_name || 'Athlete');

  if (isLoading && !stored) {
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

        <RoamStatsCard userId={user?.id} />

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
