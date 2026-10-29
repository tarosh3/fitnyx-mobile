import { Illustration } from '@/src/components/art/Illustration';
import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText, History } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorkoutHistory } from '@/src/features/workouts/hooks';
import { fmtKm, fmtVolume, plural } from '@/src/features/workouts/model';
import { RecentRow } from '@/src/features/workouts/train/TrainSections';
import { weekKeys } from '@/src/features/workouts/train/WeekCard';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { localDateKey, type HistorySession } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';

type Filter = 'all' | 'strength' | 'cardio';

export const isCardioSession = (s: HistorySession) =>
  s.exercises.length > 0 && s.exercises.every((e) => e.tracking_type === 'cardio');

export function sessionDetail(s: HistorySession): string {
  if (isCardioSession(s)) {
    const m = s.exercises.reduce((n, e) => n + (e.total_distance_m ?? 0), 0);
    return m > 0 ? `${fmtKm(m)} km` : plural(s.total_sets, 'set');
  }
  return s.total_volume_kg > 0 ? `${fmtVolume(s.total_volume_kg)} kg lifted` : plural(s.total_sets, 'set');
}

function MonthCalendar({ sessions }: { sessions: HistorySession[] }) {
  const c = useThemeColors();
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = localDateKey(now);
  const byDay = new Map<string, HistorySession>();
  sessions.forEach((s) => { if (!byDay.has(s.workout_date)) byDay.set(s.workout_date, s); });
  const monthKey = localDateKey(first).slice(0, 7);
  const count = sessions.filter((s) => s.workout_date.startsWith(monthKey)).length;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.calHead}>
        <Pressable onPress={() => setOffset(offset - 1)} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.arrow}>
          <ChevronLeft size={22} color={c.text} />
        </Pressable>
        <View style={styles.calTitle}>
          <Text style={[styles.monthName, { color: c.text }]}>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
          <Text style={[styles.meta, { color: c.mutedText }]}>{plural(count, 'workout')}</Text>
        </View>
        <Pressable onPress={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0} accessibilityRole="button"
          accessibilityLabel="Next month" style={[styles.arrow, offset === 0 && { opacity: 0.3 }]}>
          <ChevronRight size={22} color={c.text} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={[styles.dow, { color: c.mutedText }]}>{d}</Text>)}
        {Array.from({ length: lead }, (_, i) => <View key={`l${i}`} style={styles.cell} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
          const s = byDay.get(key);
          const tone = s ? (isCardioSession(s) ? c.parts.cardio : c.parts.core) : null;
          const cell = (
            <View style={[styles.cell, styles.cellInner, tone && { backgroundColor: tone.bg }, key === today && { borderWidth: 2, borderColor: c.accent }]}>
              <Text style={[styles.cellText, { color: tone ? tone.fg : c.text }, tone && { fontFamily: type.weight.extrabold }]}>{i + 1}</Text>
            </View>
          );
          return s ? (
            <Pressable key={key} onPress={() => router.push(`/workouts/history/${s.id}`)} accessibilityRole="button"
              accessibilityLabel={`${i + 1}: ${s.plan_name || 'Workout'}. Open`} style={styles.cellWrap}>{cell}</Pressable>
          ) : <View key={key} style={styles.cellWrap}>{cell}</View>;
        })}
      </View>
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: c.parts.core.fg }]} /><Text style={[styles.meta, { color: c.mutedText }]}>Strength</Text>
        <View style={[styles.swatch, { backgroundColor: c.parts.cardio.fg, marginLeft: spacing.md }]} /><Text style={[styles.meta, { color: c.mutedText }]}>Cardio</Text>
      </View>
    </View>
  );
}

type Item = { kind: 'head'; title: string } | { kind: 'row'; s: HistorySession; first: boolean; last: boolean };

export function HistoryTab({ header }: { header: React.ReactElement }) {
  const workoutInset = useWorkoutOverlayInset();
  const c = useThemeColors();
  const router = useRouter();
  const history = useWorkoutHistory();
  const [filter, setFilter] = useState<Filter>('all');
  const sessions = history.data ?? [];

  const items = useMemo<Item[]>(() => {
    const week = weekKeys();
    const lastWeek = weekKeys(new Date(Date.now() - 7 * 86400000));
    const shown = sessions.filter((s) => filter === 'all' || (filter === 'cardio') === isCardioSession(s));
    const groups: [string, HistorySession[]][] = [['This week', []], ['Last week', []], ['Earlier', []]];
    shown.forEach((s) => groups[week.includes(s.workout_date) ? 0 : lastWeek.includes(s.workout_date) ? 1 : 2][1].push(s));
    const out: Item[] = [];
    groups.forEach(([title, list]) => {
      if (!list.length) return;
      out.push({ kind: 'head', title });
      list.forEach((s, i) => out.push({ kind: 'row', s, first: i === 0, last: i === list.length - 1 }));
    });
    return out;
  }, [sessions, filter]);

  const top = (
    <View>
      {header}
      <Pressable testID="open-reports" onPress={() => router.push('/workouts/report')} accessibilityRole="button"
        accessibilityLabel="Reports: export a PDF or CSV, or read your AI report"
        style={({ pressed }) => [styles.reports, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        <FileText size={20} color={c.accent} />
        <View style={styles.reportsText}>
          <Text style={[styles.reportsTitle, { color: c.text }]}>Reports</Text>
          <Text style={[styles.reportsSub, { color: c.mutedText }]}>PDF, CSV and your weekly AI report</Text>
        </View>
        <ChevronRight size={20} color={c.mutedText} />
      </Pressable>
      {sessions.length ? (
        <>
          <View style={styles.gapTop}><MonthCalendar sessions={sessions} /></View>
          <View style={styles.filters}>
            {(['all', 'strength', 'cardio'] as Filter[]).map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} accessibilityRole="button" accessibilityState={{ selected: filter === f }}
                style={[styles.fchip, { borderColor: filter === f ? c.text : c.border, backgroundColor: filter === f ? c.text : c.card }]}>
                <Text style={[styles.fchipText, { color: filter === f ? c.background : c.text }]}>{f === 'all' ? 'All' : f === 'strength' ? 'Strength' : 'Cardio'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(it, i) => (it.kind === 'head' ? `h-${it.title}` : it.s.id) + i}
      ListHeaderComponent={top}
      ListEmptyComponent={history.loading ? <ContentSkeleton variant="list" label="Loading workout history" /> : (
        <View style={styles.empty}>
          <Illustration name="history" />
          <Text style={[styles.emptyTitle, { color: c.text }]}>{sessions.length ? 'Nothing here yet' : 'No workouts yet'}</Text>
          <Text style={[styles.meta, { color: c.mutedText, textAlign: 'center' }]}>Finished workouts show up here, with every set you did.</Text>
        </View>
      )}
      renderItem={({ item }) => item.kind === 'head' ? (
        <Text style={[styles.groupTitle, { color: c.text }]}>{item.title}</Text>
      ) : (
        <View style={[styles.rowWrap, { backgroundColor: c.card, borderColor: c.border },
          item.first && styles.rowFirst, item.last && styles.rowLast, !item.first && { borderTopWidth: StyleSheet.hairlineWidth }]}>
          <RecentRow cardio={isCardioSession(item.s)} item={{
            id: item.s.id, title: item.s.plan_name || 'Workout', date: item.s.workout_date,
            minutes: Math.max(1, Math.round(item.s.total_duration_sec / 60)), detail: sessionDetail(item.s),
          }} />
        </View>
      )}
      contentContainerStyle={[styles.content, { paddingBottom: 140 + workoutInset }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  reports: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.base, padding: spacing.md, minHeight: 64, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth },
  reportsText: { flex: 1, minWidth: 0 },
  reportsTitle: { fontFamily: type.weight.bold, fontSize: 16 },
  reportsSub: { fontFamily: type.weight.regular, fontSize: 14 },
  gapTop: { marginTop: spacing.base },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md + 2, gap: spacing.sm },
  calHead: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  calTitle: { flex: 1, alignItems: 'center' },
  monthName: { fontFamily: type.weight.bold, fontSize: 17 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 12, paddingBottom: 4 },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { width: `${100 / 7}%`, height: 44 },
  cellInner: { width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
  fchip: { minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  fchipText: { fontFamily: type.weight.semibold, fontSize: 15 },
  groupTitle: { fontFamily: type.weight.bold, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  rowWrap: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'], paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: type.weight.bold, fontSize: 18 },
});
