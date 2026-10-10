import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatTile } from '@/src/features/roam/components/StatTile';
import { formatDistance, formatDuration } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivityWeek } from '@/src/lib/api/activities';

/** Counted Roams over the last 7 days (vehicle-flagged ones excluded server-side). */
export function WeekSummary({ week }: { week: ActivityWeek }) {
  const palette = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.mutedText }]}>LAST 7 DAYS</Text>
      <View style={styles.row}>
        <StatTile label="Roams" value={String(week.count)} />
        <StatTile label="Distance" value={formatDistance(week.distance_m)} />
        <StatTile label="Moving" value={formatDuration(week.moving_time_sec)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 12 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginLeft: 4 },
  row: { flexDirection: 'row' },
});
