import { Check, ChevronRight, Repeat } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DietLog } from '@/src/lib/api/diet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { SLOT_LABELS, type PlanMeal } from '../model';
import { MacroLine, MealGlyph, VegMark } from '../ui/bits';

/**
 * A planned meal. `next` gets the one-tap "I ate this" + Swap; others get a
 * check button. A logged meal shows what was actually logged (a swap or portion).
 */
export function MealCard({ meal, log, next, onToggle, onOpen }: {
  meal: PlanMeal; log?: DietLog; next: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const c = useThemeColors();
  const eaten = !!log;
  const swapped = log && log.name !== meal.title;
  const shown = log ? { kcal: log.kcal, protein: log.protein_g, carbs: log.carbs_g, fat: log.fat_g } : meal.macros;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: next ? c.primary : c.border, borderWidth: next ? 2 : StyleSheet.hairlineWidth }]}>
      <View style={styles.row}>
        <MealGlyph slot={meal.slot} />
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${meal.label}${meal.time ? ` at ${meal.time}` : ''}: ${swapped ? log?.name : meal.title}, ${Math.round(shown.kcal)} kcal${eaten ? ', eaten' : next ? ', up next' : ''}. Open details`}
          style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
          <View style={styles.meta}>
            <Text style={[styles.slot, { color: c.mutedText }]} numberOfLines={1}>{meal.label || SLOT_LABELS[meal.slot]}{meal.time ? ` · ${meal.time}` : ''}</Text>
            {eaten ? <Text style={[styles.pill, { color: c.accent, backgroundColor: c.accentSoft }]}>Eaten</Text> : null}
            {next ? <Text style={[styles.pill, { color: c.primaryText, backgroundColor: c.primary }]}>Up next</Text> : null}
          </View>
          <View style={styles.titleRow}>
            <VegMark veg={meal.veg} />
            <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{swapped ? log?.name : meal.title}</Text>
            <ChevronRight size={16} color={c.mutedText} />
          </View>
          {swapped ? <Text style={[styles.desc, { color: c.mutedText }]}>Swapped for the planned {meal.title}</Text>
            : meal.desc ? <Text style={[styles.desc, { color: c.mutedText }]} numberOfLines={2}>{meal.desc}</Text> : null}
          <MacroLine {...shown} />
        </Pressable>
        {!next ? (
          <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: eaten }}
            accessibilityLabel={eaten ? `Undo: ${meal.label} not eaten` : `Mark ${meal.label} as eaten`}
            style={({ pressed }) => [styles.check, eaten ? { backgroundColor: c.primary } : { borderWidth: 1.5, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            <Check size={20} color={eaten ? c.primaryText : c.mutedText} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </View>
      {next ? (
        <View style={styles.actions}>
          <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={`I ate ${meal.title}`}
            style={({ pressed }) => [styles.primary, { backgroundColor: c.primary }, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Check size={18} color={c.primaryText} strokeWidth={2.6} />
            <Text style={[styles.primaryText, { color: c.primaryText }]}>I ate this</Text>
          </Pressable>
          <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Swap or adjust ${meal.title}`}
            style={({ pressed }) => [styles.secondary, { borderColor: c.border, backgroundColor: c.card }, pressed && { opacity: 0.7 }]}>
            <Repeat size={18} color={c.text} />
            <Text style={[styles.secondaryText, { color: c.text }]}>Swap</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: spacing.base },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md + 2 },
  body: { flex: 1, minWidth: 0, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slot: { fontFamily: type.weight.semibold, fontSize: 13, flexShrink: 1 },
  pill: { fontFamily: type.weight.bold, fontSize: 12, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  desc: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  check: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md + 2 },
  primary: { flex: 1, minHeight: 48, borderRadius: radii.md + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryText: { fontFamily: type.weight.bold, fontSize: 15 },
  secondary: { minHeight: 48, paddingHorizontal: 18, borderRadius: radii.md + 2, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
