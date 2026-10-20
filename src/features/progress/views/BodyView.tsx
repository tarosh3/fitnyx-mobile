import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { fmtWeight } from '@/src/lib/decimal';
import { cmToFt, kgToLbs, useHeightUnit, useWeightUnit } from '@/src/lib/prefs';
import { radii, spacing, type } from '@/src/styles/tokens';
import type { BodyMetric } from '../data';
import { shortDate, type DateRange } from '../range';
import { BigNumber, CardTitle, Empty, Eyebrow, Muted } from '../ui/bits';
import { LineChart } from '../ui/Charts';

const MEASURES = [['chest_cm', 'Chest'], ['waist_cm', 'Waist'], ['hips_cm', 'Hips'], ['arms_cm', 'Arms'], ['thigh_cm', 'Thigh'], ['neck_cm', 'Neck']] as const;
/** The gauge spans BMI 15–40; each band's width matches its share of that. */
const BMI_FLEX = [3.5, 6.5, 5, 10];
const BMI_SCALE = [{ upTo: 18.5, label: 'Under' }, { upTo: 25, label: 'Healthy' }, { upTo: 30, label: 'Over' }, { upTo: 40, label: 'Obese' }];

const dateOf = (m: BodyMetric) => localDateKey(new Date(m.recorded_at));

export function BodyView({ history, targetKg, range }: { history: BodyMetric[]; targetKg: number | null; range: DateRange }) {
  const c = useThemeColors();
  const router = useRouter();
  const [wUnit] = useWeightUnit();
  const [hUnit] = useHeightUnit();
  const w = (kg: number) => (wUnit === 'lbs' ? kgToLbs(kg) : kg);
  const sorted = [...history].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const weights = sorted.filter((m) => m.weight_kg);
  const inRange = weights.filter((m) => dateOf(m) >= range.from && dateOf(m) <= range.to);
  const latestW = weights[weights.length - 1]?.weight_kg ?? null;
  const height = [...sorted].reverse().find((m) => m.height_cm)?.height_cm ?? null;
  const bmi = latestW && height ? latestW / (height / 100) ** 2 : null;
  const bmiBand = bmi ? BMI_SCALE.find((b) => bmi < b.upTo) ?? BMI_SCALE[3] : null;
  const change = inRange.length > 1 ? inRange[inRange.length - 1].weight_kg! - inRange[0].weight_kg! : null;
  const measured = [...sorted].reverse().find((m) => m.measurements && Object.keys(m.measurements).length);
  const heightText = height ? (hUnit === 'ft' ? `${cmToFt(height).ft} ft ${cmToFt(height).in} in` : `${Math.round(height)} cm`) : '—';
  const openStats = () => router.push('/dashboard/stats');

  if (!weights.length) {
    return <Empty text="Log your weight to start a trend line" style={styles.emptyCard} />;
  }
  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Eyebrow>Weight</Eyebrow>
            <BigNumber value={fmtWeight(w(latestW!))} unit={wUnit} size={48} />
            <Muted>{change === null ? 'One entry in this range' : Math.abs(change) < 0.05 ? 'No change in this range' : `${change < 0 ? '−' : '+'}${fmtWeight(w(Math.abs(change)))} ${wUnit} in this range`}</Muted>
          </View>
          {targetKg ? (
            <View style={styles.goal}>
              <Muted>Goal</Muted>
              <Text style={[styles.goalValue, { color: c.text }]}>{fmtWeight(w(targetKg))} {wUnit}</Text>
              <Muted>{fmtWeight(w(Math.abs(latestW! - targetKg)))} {wUnit} to go</Muted>
            </View>
          ) : null}
        </View>
        {inRange.length > 1 ? (
          <LineChart values={inRange.map((m) => w(m.weight_kg!))} goal={targetKg ? w(targetKg) : null} color={c.progress.lift} height={140}
            accessibilityLabel={`Weight from ${shortDate(dateOf(inRange[0]))} to ${shortDate(dateOf(inRange[inRange.length - 1]))}`} />
        ) : <Muted>Log more entries in this range to see a trend</Muted>}
        <Pressable onPress={openStats} accessibilityRole="button" style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Log weight</Text>
        </Pressable>
      </Card>

      {bmi && bmiBand ? (
        <Card style={styles.card}>
          <View style={styles.head}>
            <View style={styles.flex}>
              <Eyebrow>BMI</Eyebrow>
              <View style={styles.inline}><BigNumber value={bmi.toFixed(1)} size={36} /><Text style={[styles.band, { color: bmiBand.label === 'Healthy' ? c.accent : c.warning }]}>{bmiBand.label}</Text></View>
            </View>
            <View style={styles.goal}><Muted>Height</Muted><Text style={[styles.goalValue, { color: c.text }]}>{heightText}</Text></View>
          </View>
          <View style={styles.scale}>
            {BMI_SCALE.map((b, i) => <View key={b.label} style={[styles.scalePart, { flex: BMI_FLEX[i], backgroundColor: [c.diet.carbs, c.progress.lift, c.diet.fat, c.progress.roam][i] }]} />)}
            <View style={[styles.marker, { left: `${Math.min(98, Math.max(2, ((bmi - 15) / 25) * 100))}%`, backgroundColor: c.text, borderColor: c.card }]} />
          </View>
          <View style={styles.scaleLabels}>{BMI_SCALE.map((b) => <Muted key={b.label}>{b.label}</Muted>)}</View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <CardTitle title="Measurements" right={measured ? `Taken ${shortDate(dateOf(measured))}` : undefined} />
        {measured ? (
          <View style={styles.grid}>
            {MEASURES.filter(([k]) => measured.measurements![k]).map(([k, label]) => (
              <View key={k} style={[styles.measure, { backgroundColor: c.surface }]}>
                <Muted>{label}</Muted>
                <BigNumber value={hUnit === 'ft' ? (measured.measurements![k] / 2.54).toFixed(1) : String(measured.measurements![k])} unit={hUnit === 'ft' ? 'in' : 'cm'} size={22} />
              </View>
            ))}
          </View>
        ) : <Muted>Add tape measurements when you log your weight</Muted>}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  emptyCard: { marginTop: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1, minWidth: 0, gap: 6 },
  goal: { alignItems: 'flex-end', gap: 4 },
  goalValue: { fontFamily: type.weight.bold, fontSize: 17 },
  inline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  band: { fontFamily: type.weight.bold, fontSize: 14 },
  button: { minHeight: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: type.weight.bold, fontSize: 14 },
  scale: { flexDirection: 'row', gap: 3, height: 10 },
  scalePart: { borderRadius: 5 },
  marker: { position: 'absolute', top: -5, width: 6, height: 20, marginLeft: -3, borderRadius: 3, borderWidth: 2 },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  measure: { flexBasis: '48%', flexGrow: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
});
