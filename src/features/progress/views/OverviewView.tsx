import { IllustratedEmpty } from '@/src/components/art/Illustration';
import { useRouter } from 'expo-router';
import { ChevronRight, Footprints, Dumbbell, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgressDay, ProgressSummary } from '@/src/lib/api/progress';
import { radii, spacing, type } from '@/src/styles/tokens';
import { formatDuration, type Bucket, type Gran, type Totals } from '../range';
import { effortName, formatClock, formatKg, isRecent } from '../records';
import { BigNumber, CardTitle, Change, Dot, Eyebrow, Muted } from '../ui/bits';
import { Bars } from '../ui/Charts';
import { StreakCard } from '../ui/StreakCard';

export interface OverviewProps {
  span: number;
  gran: Gran;
  buckets: Bucket[];
  totals: Totals;
  change: number | null;
  summary?: ProgressSummary;
  monthDays: ProgressDay[];
  today: string;
  insight?: string;
  onStrength: () => void;
}

function NewRecords({ summary, today }: { summary: ProgressSummary; today: string }) {
  const c = useThemeColors();
  const router = useRouter();
  const rows = [
    ...summary.records.lifts.filter((l) => isRecent(l.date, today)).map((l) => ({ key: l.exercise_uuid, lift: true, name: l.name, value: formatKg(l.e1rm_kg), unit: 'kg', sub: 'Estimated 1-rep max', date: l.date })),
    ...summary.records.efforts.filter((e) => isRecent(e.date, today)).map((e) => ({ key: `e${e.km}`, lift: false, name: effortName(e.km), value: formatClock(e.sec), unit: undefined, sub: 'Best effort', date: e.date })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!rows.length) return null;
  return (
    <Card style={styles.listCard}>
      <View style={styles.listHead}><CardTitle title="New records" right="Trophy case" onRight={() => router.push('/trophies')} /></View>
      {rows.map((r) => (
        <Pressable key={r.key} onPress={() => router.push('/trophies')} accessibilityRole="button" style={[styles.row, { borderTopColor: c.border }]}>
          <View style={[styles.tile, { backgroundColor: r.lift ? c.progress.liftSoft : c.progress.roamSoft }]}>
            {r.lift ? <Dumbbell size={19} color={c.progress.lift} /> : <Footprints size={19} color={c.progress.roam} />}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: c.text }]}>{r.name}</Text>
            <Muted>{r.sub}</Muted>
          </View>
          <BigNumber value={r.value} unit={r.unit} size={20} />
        </Pressable>
      ))}
    </Card>
  );
}

export function OverviewView(p: OverviewProps) {
  const c = useThemeColors();
  const router = useRouter();
  const time = formatDuration(p.totals.workoutSec + p.totals.roamSec);
  const bars = p.buckets.map((b) => ({ label: b.label, parts: [{ value: b.workoutSec, color: c.progress.lift }, { value: b.roamSec, color: c.progress.roam }] }));
  return (
    <View style={styles.stack}>
      {p.totals.workouts === 0 && p.totals.roams === 0 ? <Card><IllustratedEmpty art="progress" title="Your progress starts with one session" detail="No activity in this date range. Log a workout or a Roam to see your trends." action="Explore workouts" onAction={() => router.push('/workouts')} /></Card> : <Card style={styles.hero}>
        <Eyebrow>Active time</Eyebrow>
        <View style={styles.timeRow}>
          <BigNumber value={String(time.h)} unit="h" size={56} />
          <BigNumber value={String(time.m).padStart(2, '0')} unit="m" size={56} />
        </View>
        <Change pct={p.change} suffix={`vs the ${p.span} days before`} />
        <View style={styles.chart}>
          <Bars data={bars} height={120} accessibilityLabel={`Active time by ${p.gran}: ${time.h} hours ${time.m} minutes in total`} />
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}><Dot color={c.progress.lift} /><Muted>Lifting</Muted></View>
          <View style={styles.legendItem}><Dot color={c.progress.roam} /><Muted>Roam</Muted></View>
        </View>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <View style={styles.trio}>
          <View style={styles.flex}><BigNumber value={String(p.totals.workouts)} size={26} /><Muted>Workouts</Muted></View>
          <View style={styles.flex}><BigNumber value={(p.totals.distanceM / 1000).toFixed(1)} unit="km" size={26} /><Muted>Roamed</Muted></View>
          <View style={styles.flex}><BigNumber value={(p.totals.volumeKg / 1000).toFixed(1)} unit="t" size={26} /><Muted>Lifted</Muted></View>
        </View>
      </Card>}

      <StreakCard streak={p.summary?.streak} days={p.monthDays} today={p.today} />

      {p.insight ? (
        <Card style={styles.insight}>
          <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}><Sparkles size={19} color={c.accent} /></View>
          <View style={styles.flex}>
            <Eyebrow color={c.accent}>Filo's read</Eyebrow>
            <Text style={[styles.insightText, { color: c.text }]}>{p.insight}</Text>
            <Pressable onPress={p.onStrength} accessibilityRole="button" style={styles.insightLink} hitSlop={8}>
              <Text style={[styles.link, { color: c.accent }]}>See strength trends</Text>
              <ChevronRight size={15} color={c.accent} />
            </Pressable>
          </View>
        </Card>
      ) : null}

      {p.summary ? <NewRecords summary={p.summary} today={p.today} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  hero: { padding: spacing.lg, gap: spacing.sm },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  chart: { marginTop: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  trio: { flexDirection: 'row', gap: spacing.md },
  insight: { flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  insightText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, marginTop: 4 },
  insightLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 },
  link: { fontFamily: type.weight.bold, fontSize: 13 },
  listCard: { padding: 0, overflow: 'hidden' },
  listHead: { padding: spacing.base, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 60 },
  tile: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
});
