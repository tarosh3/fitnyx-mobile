import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { DashboardStats } from './components/DashboardStats';
import { ProfileHeader } from './components/ProfileHeader';
import { QuickActionsGrid } from './components/QuickActionsGrid';

const BG_DARK = '#0A0A0A';
const NEON_LIME = '#80f20d';

interface MobileDashboardProps {
  user: any;
  avatarUrl?: string | null;
}

export function MobileDashboard({ user, avatarUrl }: MobileDashboardProps) {
  const metrics = useRetentionMetrics(user?.id);

  const userName = (user?.user_metadata?.username || user?.user_metadata?.first_name || 'Athlete');

  if (metrics.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={NEON_LIME} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <ProfileHeader
          userName={userName}
          avatarUrl={avatarUrl}
          variant="dashboard"
        />

        <DashboardStats
          weight={79.0}
          bmi={24.4}
          height={180.0}
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
    backgroundColor: BG_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 12,
  },
});
