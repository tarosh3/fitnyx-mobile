import { Check, ChevronRight, Plus, Repeat } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DietLog } from '@/src/lib/api/diet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { SLOT_LABELS, type PlanMeal } from '../model';
import { MacroLine, MealGlyph, VegMark } from '../ui/bits';

export function MealCard({ meal, log, next, onToggle, onOpen }: {
  meal: PlanMeal; log?: DietLog; next: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const c = useThemeColors();
  const eaten = !!log;
  const swapped = log && log.name !== meal.title;
  const shown = log ? { kcal: log.kcal, protein: log.protein_g, carbs: log.carbs_g, fat: log.fat_g } : meal.macros;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: next ? c.accent : c.border }]}>
      <View style={styles.header}>
        <MealGlyph slot={meal.slot} size={40} />
        <View style={styles.grow}>
          <Text style={[styles.slot, { color: c.text }]}>{meal.label || SLOT_LABELS[meal.slot]}</Text>
          {meal.time ? <Text style={[styles.time, { color: c.mutedText }]}>{meal.time}</Text> : null}
        </View>
        {next ? <Text style={[styles.pill, { color: c.accent, backgroundColor: c.accentSoft }]}>Up next</Text> : null}
        {!next ? <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: eaten }}
          accessibilityLabel={eaten ? `Undo: ${meal.label} not eaten` : `Mark ${meal.label} as eaten`}
          style={({ pressed }) => [styles.check, { backgroundColor: eaten ? c.accentSoft : c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          {eaten ? <Check size={20} color={c.accent} strokeWidth={2.5} /> : <Plus size={20} color={c.text} />}
        </Pressable> : null}
      </View>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${meal.label}${meal.time ? ` at ${meal.time}` : ''}: ${swapped ? log?.name : meal.title}, ${Math.round(shown.kcal)} kcal${eaten ? ', eaten' : next ? ', up next' : ''}. Open details`}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, next && styles.featuredTitle, { color: c.text }]} numberOfLines={2}>{swapped ? log?.name : meal.title}</Text>
          <ChevronRight size={18} color={c.mutedText} />
        </View>
        {next && meal.desc && !swapped ? <Text style={[styles.desc, { color: c.mutedText }]} numberOfLines={2}>{meal.desc}</Text> : null}
        {swapped ? <Text style={[styles.desc, { color: c.mutedText }]}>Instead of {meal.title}</Text> : null}
        <View style={styles.nutrition}>
          <VegMark veg={log ? log.items[0]?.is_veg ?? null : meal.veg} />
          <MacroLine {...shown} />
        </View>
        {eaten ? <Text style={[styles.logged, { color: c.accent }]}>Logged · Tap to adjust</Text> : null}
      </Pressable>
      {next ? <View style={styles.actions}>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={`I ate ${meal.title}`}
          style={({ pressed }) => [styles.primary, { backgroundColor: c.primary }, pressed && { opacity: 0.8 }]}>
          <Check size={18} color={c.primaryText} strokeWidth={2.5} /><Text style={[styles.actionText, { color: c.primaryText }]}>I ate this</Text>
        </Pressable>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Swap or adjust ${meal.title}`}
          style={({ pressed }) => [styles.secondary, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <Repeat size={17} color={c.text} /><Text style={[styles.actionText, { color: c.text }]}>Adjust</Text>
        </Pressable>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1, gap: 3 },
  slot: { fontFamily: type.weight.semibold, fontSize: 13 },
  time: { fontFamily: type.weight.regular, fontSize: 11 },
  pill: { fontFamily: type.weight.bold, fontSize: 11, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
  check: { width: 44, height: 44, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 9, paddingTop: 14, minHeight: 44 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: type.weight.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.4 },
  featuredTitle: { fontSize: 22, lineHeight: 28, fontFamily: type.weight.extrabold },
  desc: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
  nutrition: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logged: { fontFamily: type.weight.medium, fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  primary: { flex: 1, minWidth: 120, minHeight: 48, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontFamily: type.weight.bold, fontSize: 14 },
});
