import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { activityTitle } from '@/src/features/roam/activityName';
import { ActivityTypeIcon } from '@/src/features/roam/components/ActivityTypeIcon';
import { formatDistance, formatDurationHuman, formatSpeed } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';

/**
 * One past Roam in the history list. `pending`: saved offline, not uploaded
 * yet — no detail screen or XP until it is.
 */
export function ActivityRow({
  activity,
  onPress,
  pending = false,
}: {
  activity: ActivitySummary;
  onPress?: () => void;
  pending?: boolean;
}) {
  const palette = useThemeColors();
  const date = dayLabel(new Date(activity.started_at));
  const rate = formatSpeed(activity.avg_speed_mps);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: palette.card, borderColor: palette.border }, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.icon, { backgroundColor: palette.surface }]}>
        <ActivityTypeIcon type={activity.activity_type} color={palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {activityTitle(activity)}
        </Text>
        <Text style={[styles.sub, { color: palette.mutedText }]} numberOfLines={1}>
          {date} · {formatDistance(activity.distance_m)} · {formatDurationHuman(activity.moving_time_sec)} · {rate}
        </Text>
        {pending ? (
          <Text style={[styles.flag, { color: palette.mutedText }]}>Waiting to upload · syncs when you're online</Text>
        ) : !activity.xp_eligible ? (
          <Text style={[styles.flag, { color: palette.warning }]}>
            {activity.vehicle_detected ? 'Vehicle travel detected — not counted' : 'Too short to count'}
          </Text>
        ) : (
          <Text style={[styles.flag, { color: palette.primary }]}>+{activity.xp} XP</Text>
        )}
      </View>
      {onPress ? <ChevronRight size={18} color={palette.mutedText} /> : null}
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
  title: { fontSize: 15, fontFamily: type.weight.extrabold },
  sub: { fontSize: 12, marginTop: 2 },
  flag: { fontSize: 11, fontFamily: type.weight.bold, marginTop: 4 },
});
