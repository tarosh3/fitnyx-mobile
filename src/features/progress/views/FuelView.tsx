import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { goalsFromPlan, withDietGoals } from '@/src/features/diet/model';
import { useDietPlan, useDietSummary } from '@/src/features/diet/data/useDiet';
import { useGoals } from '@/src/features/goals/data';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import type { Bucket, DateRange, Gran } from '../range';
import { BigNumber, CardTitle, Dot, Empty, Eyebrow, Muted } from '../ui/bits';
import { Bars } from '../ui/Charts';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function FuelView({ userId, range, buckets, gran }: { userId?: string; range: DateRange; buckets: Bucket[]; gran: Gran }) {
  const c = useThemeColors();
  const router = useRouter();
  const { summary, offline } = useDietSummary(userId, range.from, range.to);
  const { plan } = useDietPlan(userId);
  const goals = withDietGoals(goalsFromPlan(plan), useGoals().data);
  const logged = (summary?.days ?? []).filter((d) => d.meals > 0);

  if (!summary) return offline ? <Empty text="You're offline. Food logs show up when you reconnect" /> : <ContentSkeleton variant="progress" label="Loading nutrition progress" />;
  if (!logged.length) {
    return (
      <Card style={styles.card}>
        <CardTitle title="Nothing logged in this range" />
        <Muted>Log meals in Diet to see calories and macros here.</Muted>
        <Pressable onPress={() => router.push('/diet')} accessibilityRole="button" style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Open Diet</Text>
        </Pressable>
      </Card>
    );
  }

  const avg = (k: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g') => logged.reduce((a, d) => a + d[k], 0) / logged.length;
  const kcal = avg('kcal');
  const macro = [
    { key: 'Protein', g: avg('protein_g'), kcal: avg('protein_g') * 4, color: c.diet.protein },
    { key: 'Carbs', g: avg('carbs_g'), kcal: avg('carbs_g') * 4, color: c.diet.carbs },
    { key: 'Fat', g: avg('fat_g'), kcal: avg('fat_g') * 9, color: c.diet.fat },
  ];
  const macroTotal = macro.reduce((a, m) => a + m.kcal, 0) || 1;
  // Average per logged day in each bucket, so a half-logged week isn't drawn as a light week.
  const bars = buckets.map((b) => {
    const ds = logged.filter((d) => d.date >= b.start && d.date <= b.end);
    const v = ds.length ? ds.reduce((a, d) => a + d.kcal, 0) / ds.length : 0;
    return { label: b.label, parts: [{ value: v, color: goals && v > goals.kcal * 1.1 ? c.diet.over : c.progress.lift }] };
  });
  const proteinDays = goals?.protein ? logged.filter((d) => d.protein_g >= goals.protein * 0.9).length : null;

  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <Eyebrow>Calories</Eyebrow>
        <BigNumber value={fmt(kcal)} unit="avg kcal / day" size={48} />
        <Muted>{goals ? `Target ${fmt(goals.kcal)} · ${Math.round((kcal / goals.kcal) * 100)}% of plan` : 'Set up a diet plan to compare with a target'}</Muted>
        <View style={styles.chart}>
          <Bars data={bars} height={110} target={goals?.kcal} accessibilityLabel={`Average calories by ${gran}`} />
        </View>
        <Muted>{logged.length} of {summary.days.length} days logged{goals ? ' · dashed line: target' : ''}</Muted>
      </Card>

      <Card style={styles.card}>
        <CardTitle title="Macros" right="Daily average" />
        <View style={styles.split}>
          {macro.map((m) => <View key={m.key} style={{ flex: m.kcal / macroTotal, backgroundColor: m.color, minWidth: 4 }} />)}
        </View>
        <View style={styles.trio}>
          {macro.map((m) => (
            <View key={m.key} style={styles.flex}>
              <View style={styles.inline}><Dot color={m.color} /><Text style={[styles.grams, { color: c.text }]}>{fmt(m.g)} g</Text></View>
              <Muted>{m.key} · {Math.round((m.kcal / macroTotal) * 100)}%</Muted>
            </View>
          ))}
        </View>
        {proteinDays !== null ? (
          <Muted style={styles.gapTop}>Protein goal ({fmt(goals!.protein)} g) hit on {proteinDays} of {logged.length} logged days</Muted>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  chart: { marginTop: spacing.md, marginBottom: spacing.xs },
  split: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3, marginTop: spacing.sm },
  trio: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1, gap: 3 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grams: { fontFamily: type.weight.extrabold, fontSize: 17 },
  gapTop: { marginTop: spacing.sm },
  button: { minHeight: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  buttonText: { fontFamily: type.weight.bold, fontSize: 14 },
});
