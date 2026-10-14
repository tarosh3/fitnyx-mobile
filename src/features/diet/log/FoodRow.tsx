import { Check, Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { VegMark } from '../ui/bits';

export interface FoodLike {
  name: string;
  portion_label: string;
  kcal: number;
  protein_g: number;
  is_veg: boolean | null;
}

const QTY_STEP = 0.5;
export const MAX_QTY = 20;

/** A food with its portion; once picked, a portion count stepper appears. */
export function FoodRow({ food, qty, first, onToggle, onQty }: {
  food: FoodLike; qty: number | null; first: boolean; onToggle: () => void; onQty: (q: number) => void;
}) {
  const c = useThemeColors();
  const on = qty !== null;
  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
      <View style={styles.body}>
        <View style={styles.title}>
          <VegMark veg={food.is_veg} />
          <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{food.name}</Text>
        </View>
        <Text style={[styles.meta, { color: c.mutedText }]}>{food.portion_label} · {Math.round(food.kcal)} kcal · {Math.round(food.protein_g)} g protein</Text>
        {on ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => onQty(Math.max(QTY_STEP, qty - QTY_STEP))} disabled={qty <= QTY_STEP} accessibilityRole="button" accessibilityLabel={`Less ${food.name}`}
              style={({ pressed }) => [styles.stepBtn, { borderColor: c.border, backgroundColor: c.surface }, qty <= QTY_STEP && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
              <Minus size={16} color={c.text} strokeWidth={2.4} />
            </Pressable>
            <Text style={[styles.qty, { color: c.text }]} accessibilityLiveRegion="polite">{qty} × · {Math.round(food.kcal * qty)} kcal</Text>
            <Pressable onPress={() => onQty(Math.min(MAX_QTY, qty + QTY_STEP))} disabled={qty >= MAX_QTY} accessibilityRole="button" accessibilityLabel={`More ${food.name}`}
              style={({ pressed }) => [styles.stepBtn, { borderColor: c.border, backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
              <Plus size={16} color={c.text} strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${on ? 'Remove' : 'Add'} ${food.name}`}
        style={({ pressed }) => [styles.toggle, on ? { backgroundColor: c.primary } : { borderWidth: 1.5, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        {on ? <Check size={18} color={c.primaryText} strokeWidth={2.6} /> : <Plus size={18} color={c.text} strokeWidth={2.4} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, paddingLeft: spacing.base, paddingRight: spacing.md, minHeight: 64 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: type.weight.semibold, fontSize: 15, flexShrink: 1 },
  meta: { fontFamily: type.weight.regular, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stepBtn: { width: 44, height: 40, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: type.weight.bold, fontSize: 14, minWidth: 96, textAlign: 'center' },
  toggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
