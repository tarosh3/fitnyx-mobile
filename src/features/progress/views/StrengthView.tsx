import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgressStrength } from '@/src/lib/api/progress';
import { spacing, type } from '@/src/styles/tokens';
import type { Bucket, Gran, Totals } from '../range';
import { formatKg } from '../records';
import { BigNumber, CardTitle, Change, Empty, Eyebrow, Muted } from '../ui/bits';
import { Bars, Sparkline } from '../ui/Charts';

/** Sets per muscle per week that build muscle (the band drawn on each bar). */
const BAND = { low: 10, high: 20 };
/** 4 → "4", 4.25 → "4.3". */
const oneDp = (v: number) => String(Math.round(v * 10) / 10);

export function StrengthView({ buckets, totals, change, span, gran, strength, loading }: {
  buckets: Bucket[]; totals: Totals; change: number | null; span: number; gran: Gran; strength?: ProgressStrength; loading: boolean;
}) {
  const c = useThemeColors();
  const weeks = Math.max(1, span / 7);
  const perWeek = (n: number) => n / weeks;
  const bandMax = BAND.high * 1.2;
  const avgMin = totals.workouts ? Math.round(totals.workoutSec / 60 / totals.workouts) : 0;
  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <Eyebrow>Volume lifted</Eyebrow>
        <BigNumber value={(totals.volumeKg / 1000).toFixed(1)} unit="tonnes" size={48} />
        <Change pct={change} suffix={`vs the ${span} days before`} />
        <View style={styles.chart}>
          <Bars data={buckets.map((b) => ({ label: b.label, parts: [{ value: b.volumeKg, color: c.progress.lift }] }))} height={110}
            accessibilityLabel={`Volume by ${gran}`} />
        </View>
      </Card>

      <Card style={styles.card}>
        <CardTitle title="Sets per muscle" right="Per week" />
        <Muted>The shaded band is {BAND.low}–{BAND.high} sets a week, the range that builds muscle</Muted>
        {strength?.muscles.length ? (
          <View style={styles.muscles}>
            {strength.muscles.map((m) => {
              const v = perWeek(m.sets);
              const color = v < BAND.low ? c.warning : c.progress.lift;
              return (
                <View key={m.group} style={styles.muscleRow} accessible accessibilityLabel={`${m.group}: ${oneDp(v)} sets a week`}>
                  <Text style={[styles.muscleName, { color: c.text }]}>{m.group}</Text>
                  <View style={[styles.track, { backgroundColor: c.progress.empty }]}>
                    <View style={[styles.band, { left: `${(BAND.low / bandMax) * 100}%`, width: `${((BAND.high - BAND.low) / bandMax) * 100}%`, backgroundColor: `${c.mutedText}40` }]} />
                    <View style={[styles.fill, { width: `${Math.min(100, (v / bandMax) * 100)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.muscleVal, { color }]}>{v < 10 ? oneDp(v) : Math.round(v)}</Text>
                </View>
              );
            })}
          </View>
        ) : <Empty text={loading ? 'Loading…' : 'Log a workout in this range to see which muscles you trained'} style={styles.gapTop} />}
      </Card>

      <Card style={styles.listCard}>
        <View style={styles.listHead}><CardTitle title="Top lifts" right="Est. 1-rep max" /></View>
        {strength?.lifts.length ? strength.lifts.map((l) => {
          const pts = l.points.map((p) => p.e1rm_kg);
          const last = pts[pts.length - 1];
          const diff = last - pts[0];
          return (
            <View key={l.exercise_uuid} style={[styles.row, { borderTopColor: c.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{l.name}</Text>
                <Muted>{l.sets} sets</Muted>
              </View>
              <Sparkline values={pts} color={c.progress.lift} />
              <View style={styles.right}>
                <BigNumber value={formatKg(Math.max(...pts))} unit="kg" size={20} />
                {pts.length > 1 ? <Text style={[styles.delta, { color: diff >= 0 ? c.accent : c.warning }]}>{diff >= 0 ? '+' : '−'}{formatKg(Math.abs(diff))} kg</Text> : null}
              </View>
            </View>
          );
        }) : <Empty text={loading ? 'Loading…' : 'Weighted sets of 1–12 reps show up here'} style={styles.inset} />}
      </Card>

      <Card style={[styles.card, styles.trio]}>
        <View style={styles.flex}><BigNumber value={oneDp(perWeek(totals.workouts))} size={24} /><Muted>Workouts / week</Muted></View>
        <View style={styles.flex}><BigNumber value={`${avgMin}m`} size={24} /><Muted>Avg workout</Muted></View>
        <View style={styles.flex}><BigNumber value={String(totals.sets)} size={24} /><Muted>Sets</Muted></View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  chart: { marginTop: spacing.md },
  muscles: { gap: 13, marginTop: spacing.md },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muscleName: { width: 92, fontFamily: type.weight.semibold, fontSize: 13 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 5 },
  muscleVal: { width: 32, textAlign: 'right', fontFamily: type.weight.bold, fontSize: 13 },
  gapTop: { marginTop: spacing.md },
  listCard: { padding: 0, overflow: 'hidden' },
  listHead: { padding: spacing.base, paddingBottom: spacing.sm },
  inset: { margin: spacing.base, marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
  right: { alignItems: 'flex-end', minWidth: 76, gap: 4 },
  delta: { fontFamily: type.weight.bold, fontSize: 11 },
  trio: { flexDirection: 'row', gap: spacing.md },
});
