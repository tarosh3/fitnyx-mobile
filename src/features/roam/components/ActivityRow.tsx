import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACTIVITY_LABEL, ActivityTypeIcon } from '@/src/features/roam/components/ActivityTypeIcon';
import { formatDistance, formatDurationHuman, formatPace, formatSpeed } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';

/** One past Roam in the history list. */
export function ActivityRow({ activity, onPress }: { activity: ActivitySummary; onPress: () => void }) {
  const palette = useThemeColors();
  const date = dayLabel(new Date(activity.started_at));
  const rate =
    activity.activity_type === 'cycle' ? formatSpeed(activity.avg_speed_mps) : formatPace(activity.avg_pace_sec_per_km);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: palette.card, borderColor: palette.border }, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.icon, { backgroundColor: palette.surface }]}>
        <ActivityTypeIcon type={activity.activity_type} color={palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]}>
          {ACTIVITY_LABEL[activity.activity_type]} · {formatDistance(activity.distance_m)}
        </Text>
        <Text style={[styles.sub, { color: palette.mutedText }]}>
          {date} · {formatDurationHuman(activity.moving_time_sec)} · {rate}
        </Text>
        {!activity.xp_eligible ? (
          <Text style={[styles.flag, { color: palette.warning }]}>
            {activity.vehicle_detected ? 'Vehicle travel detected — not counted' : 'Too short to count'}
          </Text>
        ) : (
          <Text style={[styles.flag, { color: palette.primary }]}>+{activity.xp} XP</Text>
        )}
      </View>
      <ChevronRight size={18} color={palette.mutedText} />
    </Pressable>
  );
}

/** "Today", "Yesterday", else "Sat, 10 Oct". */
function dayLabel(d: Date): string {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  flag: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
