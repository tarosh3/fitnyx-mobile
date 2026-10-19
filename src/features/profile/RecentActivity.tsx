import { useRouter } from 'expo-router';
import { Dumbbell, Footprints } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { formatClock } from '@/src/features/progress/records';
import { activityTitle } from '@/src/features/roam/activityName';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';
import type { DashboardSession } from '@/src/lib/api/dashboard';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Item { key: string; at: string; title: string; roam: boolean; stats: [string, string][]; href: string }

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Completed workouts and saved Roams, newest first. */
export function recentItems(sessions: DashboardSession[], roams: ActivitySummary[], limit = 5): Item[] {
  const items: Item[] = [
    ...sessions.filter((s) => s.status === 'completed').map((s) => ({
      key: `w${s.id}`, at: s.finished_at || s.started_at, title: s.plan_name || 'Workout', roam: false, href: `/workouts/history/${s.id}`,
      stats: [[`${Math.round(s.total_duration_sec / 60)}m`, 'Time'], [`${(s.total_volume_kg / 1000).toFixed(1)} t`, 'Volume'], [String(s.total_sets), 'Sets']] as [string, string][],
    })),
    ...roams.filter((a) => !a.id.startsWith('pending-')).map((a) => ({
      key: `r${a.id}`, at: a.started_at, title: activityTitle(a), roam: true, href: `/roam/${a.id}`,
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
    <View style={styles.list}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={() => router.push(it.href as never)} accessibilityRole="button" accessibilityLabel={`${it.title}, ${when(it.at)}`}>
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.tile, { backgroundColor: it.roam ? c.progress.roamSoft : c.progress.liftSoft }]}>
                {it.roam ? <Footprints size={19} color={c.progress.roam} /> : <Dumbbell size={19} color={c.progress.lift} />}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{it.title}</Text>
                <Text style={[styles.when, { color: c.mutedText }]}>{when(it.at)}</Text>
              </View>
            </View>
            <View style={styles.stats}>
              {it.stats.map(([v, k]) => (
                <View key={k} style={styles.flex}>
                  <Text style={[styles.value, { color: c.text }]}>{v}</Text>
                  <Text style={[styles.when, { color: c.mutedText }]}>{k}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: type.weight.bold, fontSize: 15 },
  when: { fontFamily: type.weight.regular, fontSize: 12 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  value: { fontFamily: type.weight.bold, fontSize: 16 },
});
