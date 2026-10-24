import { useRouter } from 'expo-router';
import { Bike, ChevronRight, Dumbbell, Footprints } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock } from '@/src/features/progress/records';
import { activityTitle } from '@/src/features/roam/activityName';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';
import type { DashboardSession } from '@/src/lib/api/dashboard';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Item { key: string; at: string; title: string; roam: boolean; ride?: boolean; stats: [string, string][]; href: string }

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Completed workouts and saved Roams, newest first. */
export function recentItems(sessions: DashboardSession[], roams: ActivitySummary[], limit = 5): Item[] {
  const items: Item[] = [
    ...sessions.filter((s) => s.status === 'completed').map((s) => ({
      key: `w${s.id}`, at: s.finished_at || s.started_at, title: s.plan_name || 'Workout', roam: false, href: `/workouts/history/${s.id}`,
      stats: [[`${Math.round(s.total_duration_sec / 60)}m`, 'Time'], [`${(s.total_volume_kg / 1000).toFixed(1)} t`, 'Volume'], [String(s.total_sets), 'Sets']] as [string, string][],
    })),
    ...roams.filter((a) => !a.id.startsWith('pending-')).map((a) => ({
      key: `r${a.id}`, at: a.started_at, title: activityTitle(a), roam: true, ride: a.activity_type === 'cycle', href: `/roam/${a.id}`,
      stats: [[`${(a.distance_m / 1000).toFixed(1)} km`, 'Distance'], a.activity_type === 'cycle'
        ? [a.moving_time_sec ? `${(a.distance_m / 1000 / (a.moving_time_sec / 3600)).toFixed(1)} km/h` : '—', 'Speed']
        : [a.avg_pace_sec_per_km ? `${formatClock(a.avg_pace_sec_per_km)} /km` : '—', 'Pace'], [`${Math.round(a.moving_time_sec / 60)}m`, 'Time']] as [string, string][],
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function RecentActivity({ items }: { items: Item[] }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.border }]}>
      {items.map((item, index) => (
        <Pressable key={item.key} onPress={() => router.push(item.href as never)} accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${when(item.at)}. ${item.stats.map(([value, label]) => `${label}: ${value}`).join(', ')}`}
          style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }, { opacity: pressed ? 0.65 : 1 }]}>
          <View style={[styles.tile, { backgroundColor: c.card }]}>
            {item.ride ? <Bike size={18} color={c.mutedText} /> : item.roam ? <Footprints size={18} color={c.mutedText} /> : <Dumbbell size={18} color={c.mutedText} />}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.when, { color: c.mutedText }]}>{when(item.at)}</Text>
            <Text style={[styles.stats, { color: c.text }]}>{item.stats.map(([value, label]) => label === 'Sets' ? `${value} sets` : value).join('  ·  ')}</Text>
          </View>
          <ChevronRight size={16} color={c.mutedText} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, paddingHorizontal: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.base, minHeight: 90 },
  tile: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 19 },
  when: { fontFamily: type.weight.regular, fontSize: 10, lineHeight: 16 },
  stats: { fontFamily: type.weight.medium, fontSize: 11, lineHeight: 18 },
});
