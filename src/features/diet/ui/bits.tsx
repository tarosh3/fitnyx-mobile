import { Apple, Moon, Sun, Sunrise } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MealSlot } from '@/src/lib/api/diet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Indian food-label mark: green square with a dot (veg) or brown with a triangle (non-veg). */
export function VegMark({ veg }: { veg: boolean | null }) {
  const c = useThemeColors();
  if (veg === null) return null;
  const color = veg ? c.diet.veg : c.diet.nonVeg;
  return (
    <View style={[styles.mark, { borderColor: color }]} accessible accessibilityLabel={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      {veg
        ? <View style={[styles.dot, { backgroundColor: color }]} />
        : <View style={[styles.triangle, { borderBottomColor: color }]} />}
    </View>
  );
}

const GLYPHS = { breakfast: Sunrise, lunch: Sun, snack: Apple, dinner: Moon } as const;

/** Meal-slot tile: plans have no photos, so each slot gets a tinted icon. */
export function MealGlyph({ slot, size = 56 }: { slot: MealSlot; size?: number }) {
  const c = useThemeColors();
  const tone = c.diet.slots[slot];
  const Icon = GLYPHS[slot];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size / 3.5), backgroundColor: tone.bg }]} accessible={false}>
      <Icon size={Math.round(size * 0.46)} color={tone.fg} strokeWidth={1.8} />
    </View>
  );
}

/** "16g P · 70g C · 12g F" in the macro colours. */
export function MacroLine({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.macroLine}>
      <Text style={[styles.macro, { color: c.text }]}>{Math.round(kcal)} kcal</Text>
      <Text style={[styles.macro, { color: c.diet.protein }]}>{Math.round(protein)}g P</Text>
      <Text style={[styles.macro, { color: c.diet.carbs }]}>{Math.round(carbs)}g C</Text>
      <Text style={[styles.macro, { color: c.diet.fat }]}>{Math.round(fat)}g F</Text>
    </View>
  );
}

/** Section heading with an optional right-hand note. */
export function SectionTitle({ title, note }: { title: string; note?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]} accessibilityRole="header">{title}</Text>
      {note ? <Text style={[styles.sectionNote, { color: c.mutedText }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  triangle: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  macroLine: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xxs },
  macro: { fontFamily: type.weight.semibold, fontSize: 13 },
  section: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: { fontFamily: type.weight.extrabold, fontSize: 20, letterSpacing: -0.3 },
  sectionNote: { fontFamily: type.weight.regular, fontSize: 13, borderRadius: radii.sm },
});
