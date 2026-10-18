import { Clock, Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { fmt, signed, type Macros, type PlanMeal } from '../model';
import { VegMark } from '../ui/bits';

export const PORTIONS = [0.5, 1, 1.5, 2];
export const portionLabel = (k: number) => (k === 0.5 ? '½' : k === 1.5 ? '1½' : String(k));

/** "50 g" × 1.5 → "75 g"; every number in the measure is scaled. */
export function scaleQty(qty: string, k: number): string {
  if (k === 1) return qty;
  return qty.replace(/\d+(\.\d+)?/g, (n) => String(Math.round(parseFloat(n) * k * 10) / 10));
}

export function PortionStepper({ portion, onChange }: { portion: number; onChange: (k: number) => void }) {
  const c = useThemeColors();
  const i = PORTIONS.indexOf(portion);
  const step = (d: number) => onChange(PORTIONS[Math.min(PORTIONS.length - 1, Math.max(0, i + d))]);
  const btn = (d: number, label: string, Icon: typeof Plus, disabled: boolean) => (
    <Pressable onPress={() => step(d)} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.stepBtn, { borderColor: c.border, backgroundColor: c.surface }, disabled && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
      <Icon size={18} color={c.text} strokeWidth={2.4} />
    </Pressable>
  );
  return (
    <View style={[styles.card, styles.portion, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.grow, { minWidth: 100 }]}>
        <Text style={[styles.label, { color: c.text }]}>Portion</Text>
        <Text style={[styles.muted, { color: c.mutedText }]}>{portion === 1 ? 'As planned' : `${portionLabel(portion)} × the planned serving`}</Text>
      </View>
      <View style={styles.controls}>
      {btn(-1, 'Smaller portion', Minus, i <= 0)}
      <Text style={[styles.portionValue, { color: c.text }]} accessibilityLiveRegion="polite">{portionLabel(portion)}×</Text>
      {btn(1, 'Larger portion', Plus, i >= PORTIONS.length - 1)}
      </View>
    </View>
  );
}

export function AfterThis({ kcal, protein }: { kcal: number; protein: number }) {
  const c = useThemeColors();
  return (
    <View style={[styles.after, { backgroundColor: c.accentSoft }]}>
      <Clock size={20} color={c.accent} />
      <Text style={[styles.afterText, { color: c.text }]}>
        {kcal >= 0 ? <>After this you’ll have <Text style={styles.bold}>{fmt(kcal)} kcal</Text> and <Text style={styles.bold}>{Math.max(0, Math.round(protein))} g protein</Text> left today.</>
          : <>This takes you <Text style={styles.bold}>{fmt(-kcal)} kcal</Text> over today’s goal.</>}
      </Text>
    </View>
  );
}

export function Ingredients({ meal, portion }: { meal: PlanMeal; portion: number }) {
  const c = useThemeColors();
  if (!meal.ingredients.length) {
    return meal.desc ? <Text style={[styles.body, { color: c.text }]}>{meal.desc}</Text> : null;
  }
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {meal.ingredients.map((ing, i) => (
        <View key={`${ing.name}-${i}`} style={[styles.ingRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
          <Text style={[styles.ingName, { color: c.text }]}>{ing.name}</Text>
          <Text style={[styles.ingQty, { color: c.mutedText }]}>{scaleQty(ing.qty, portion)}</Text>
          {ing.kcal !== null ? <Text style={[styles.ingKcal, { color: c.text }]}>{Math.round(ing.kcal * portion)} kcal</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Alternatives with what changes; picking one swaps the meal when logged. */
export function SwapOptions({ meal, selected, onSelect }: { meal: PlanMeal; selected: number | null; onSelect: (i: number | null) => void }) {
  const c = useThemeColors();
  return (
    <View style={styles.swaps} accessibilityRole="radiogroup">
      {meal.alternatives.map((a, i) => {
        const on = selected === i;
        const delta: Macros | null = a.macros ? { kcal: a.macros.kcal - meal.macros.kcal, protein: a.macros.protein - meal.macros.protein, carbs: 0, fat: 0 } : null;
        return (
          <Pressable key={`${a.title}-${i}`} onPress={() => onSelect(on ? null : i)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed }) => [styles.swap, { backgroundColor: c.card, borderColor: on ? c.primary : c.border, borderWidth: on ? 2 : StyleSheet.hairlineWidth }, pressed && { opacity: 0.8 }]}>
            <View style={[styles.radio, { borderColor: on ? c.primary : c.border }]}>{on ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}</View>
            <View style={styles.grow}>
              <View style={styles.swapTitle}><VegMark veg={a.veg} /><Text style={[styles.label, { color: c.text, flexShrink: 1 }]}>{a.title}</Text></View>
              {a.macros ? <Text style={[styles.muted, { color: c.mutedText }]}>{fmt(a.macros.kcal)} kcal · {Math.round(a.macros.protein)} g protein</Text>
                : <Text style={[styles.muted, { color: c.mutedText }]}>Nutrition not listed — logged with the planned values</Text>}
              {delta ? <Text style={[styles.delta, { color: Math.abs(delta.protein) <= 10 ? c.diet.protein : c.diet.over }]}>{signed(delta.kcal)} kcal · {signed(delta.protein)} g protein</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Steps({ steps }: { steps: string[] }) {
  const c = useThemeColors();
  return (
    <View style={styles.steps}>
      {steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={[styles.stepNum, { backgroundColor: c.accentSoft }]}><Text style={[styles.stepNumText, { color: c.accent }]}>{i + 1}</Text></View>
          <Text style={[styles.body, styles.grow, { color: c.text }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  portion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, padding: 14, paddingLeft: spacing.base },
  grow: { flex: 1, minWidth: 0 },
  label: { fontFamily: type.weight.bold, fontSize: 15 },
  muted: { fontFamily: type.weight.regular, fontSize: 13 },
  bold: { fontFamily: type.weight.bold },
  stepBtn: { width: 44, height: 44, borderRadius: radii.md + 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  portionValue: { minWidth: 40, textAlign: 'center', fontFamily: type.weight.extrabold, fontSize: 18 },
  after: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: radii.lg + 2, padding: 14, paddingHorizontal: spacing.base },
  afterText: { flex: 1, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, minHeight: 52 },
  ingName: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  ingQty: { fontFamily: type.weight.regular, fontSize: 14, maxWidth: 110, textAlign: 'right' },
  ingKcal: { fontFamily: type.weight.semibold, fontSize: 14, minWidth: 64, textAlign: 'right' },
  swaps: { gap: spacing.sm + 2 },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: spacing.base, borderRadius: radii.lg + 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  swapTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  delta: { fontFamily: type.weight.bold, fontSize: 12, marginTop: 2 },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: type.weight.extrabold, fontSize: 14 },
});
