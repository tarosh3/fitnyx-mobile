import { Droplets, Flame, Utensils } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { PlanTargets } from '@/src/lib/api/plan';
import { radii, spacing, type } from '@/src/styles/tokens';
import { adjustmentLabel, thousands } from './model';

const MISSING_LABELS: Record<string, string> = { weight: 'weight', height: 'height', dob: 'date of birth' };

/** Daily calories + macros, water and the training burn. */
export function TargetsCard({ targets, missing }: { targets: PlanTargets | null; missing: string[] }) {
  const c = useThemeColors();
  if (!targets) {
    const what = missing.map((m) => MISSING_LABELS[m] ?? m).join(', ');
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.h, { color: c.text }]}>Daily targets</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>Add your {what || 'body stats'} in your profile to get calorie and protein targets.</Text>
      </View>
    );
  }
  const macros = [
    { label: 'Protein', grams: targets.protein_g, tone: c.diet.protein },
    { label: 'Carbs', grams: targets.carbs_g, tone: c.diet.carbs },
    { label: 'Fat', grams: targets.fat_g, tone: c.diet.fat },
  ];
  return (
    <View testID="plan-targets" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <Utensils size={18} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>EAT EACH DAY</Text>
      </View>
      <View accessible accessibilityLabel={`${thousands(targets.calories)} calories a day. ${adjustmentLabel(targets.adjustment_kcal)}.`}>
        <Text style={[styles.big, { color: c.text }]}>{thousands(targets.calories)}<Text style={[styles.unit, { color: c.mutedText }]}> kcal</Text></Text>
        <Text style={[styles.meta, { color: c.mutedText }]}>{adjustmentLabel(targets.adjustment_kcal)} ({thousands(targets.tdee)} kcal)</Text>
      </View>
      <View style={styles.macros}>
        {macros.map((m) => (
          <View key={m.label} style={[styles.macro, { backgroundColor: c.surface, borderTopColor: m.tone }]} accessible accessibilityLabel={`${m.label} ${m.grams} grams`}>
            <Text style={[styles.macroValue, { color: c.text }]}>{m.grams} g</Text>
            <Text style={[styles.macroLabel, { color: c.mutedText }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.split, { borderColor: c.border }]}>
        <View style={styles.stat} accessible accessibilityLabel={`Burn about ${targets.burn_per_session_kcal} calories per workout, ${targets.burn_weekly_kcal} a week`}>
          <View style={styles.row}><Flame size={16} color={c.accent} /><Text style={[styles.statLabel, { color: c.mutedText }]}>Burn per workout</Text></View>
          <Text style={[styles.statValue, { color: c.text }]}>~{thousands(targets.burn_per_session_kcal)} kcal</Text>
          <Text style={[styles.meta, { color: c.mutedText }]}>~{thousands(targets.burn_weekly_kcal)} a week</Text>
        </View>
        <View style={styles.stat} accessible accessibilityLabel={`Drink ${(targets.water_ml / 1000).toFixed(1)} litres of water a day`}>
          <View style={styles.row}><Droplets size={16} color={c.accent} /><Text style={[styles.statLabel, { color: c.mutedText }]}>Water</Text></View>
          <Text style={[styles.statValue, { color: c.text }]}>{(targets.water_ml / 1000).toFixed(1)} L</Text>
          <Text style={[styles.meta, { color: c.mutedText }]}>a day</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.xs, letterSpacing: type.tracking.eyebrow },
  h: { fontFamily: type.weight.bold, fontSize: 17 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  big: { fontFamily: type.weight.extrabold, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.semibold, fontSize: 18 },
  meta: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 18 },
  macros: { flexDirection: 'row', gap: spacing.sm },
  macro: { flex: 1, borderRadius: radii.lg, borderTopWidth: 3, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, alignItems: 'center' },
  macroValue: { fontFamily: type.weight.extrabold, fontSize: 18, fontVariant: ['tabular-nums'] },
  macroLabel: { fontFamily: type.weight.medium, fontSize: 13 },
  split: { flexDirection: 'row', gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontFamily: type.weight.medium, fontSize: 13 },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 20, fontVariant: ['tabular-nums'] },
});
