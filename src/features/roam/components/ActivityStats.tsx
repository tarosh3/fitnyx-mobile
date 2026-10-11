import React from 'react';
import { StyleSheet, View } from 'react-native';

import { StatTile } from '@/src/features/roam/components/StatTile';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';

/** Saved Roam metrics (server-computed). */
export function ActivityStats({ activity }: { activity: ActivitySummary }) {
  const palette = useThemeColors();
  const cycle = activity.activity_type === 'cycle';
  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.row}>
        <StatTile label="Distance" value={formatDistance(activity.distance_m)} />
        <StatTile label="Moving time" value={formatDuration(activity.moving_time_sec)} />
      </View>
      <View style={styles.row}>
        <StatTile
          label={cycle ? 'Avg speed' : 'Avg pace'}
          value={cycle ? formatSpeed(activity.avg_speed_mps) : formatPace(activity.avg_pace_sec_per_km)}
        />
        {/* On foot everything else is a pace, so show the best stretch as one too. */}
        <StatTile
          label={cycle ? 'Max speed' : 'Best pace'}
          value={
            cycle
              ? formatSpeed(activity.max_speed_mps)
              : formatPace(activity.max_speed_mps > 0 ? 1000 / activity.max_speed_mps : null)
          }
        />
      </View>
      <View style={styles.row}>
        <StatTile label="Total time" value={formatDuration(activity.elapsed_time_sec)} />
        <StatTile label="XP" value={activity.xp_eligible ? `+${activity.xp}` : '—'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, paddingVertical: 8 },
  row: { flexDirection: 'row' },
});
