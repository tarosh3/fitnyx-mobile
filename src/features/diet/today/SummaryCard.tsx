import { ContourArt } from '@/src/components/art/ContourArt';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Pencil } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { fmt, type Macros } from '../model';

/**
 * Food imagery is decorative; every number comes from the selected day's logs.
 * burned: calories from that day's workouts + Roams (null = unknown, hidden).
 */
export function SummaryCard({ eaten, goal, burned, onEditGoals }: { eaten: Macros; goal: Macros; burned?: number | null; onEditGoals?: () => void }) {
  const c = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.2;
  const left = goal.kcal - eaten.kcal;
  const over = left < 0;
  const frac = goal.kcal > 0 ? Math.min(eaten.kcal / goal.kcal, 1) : 0;
  const macros = [
    { label: 'Protein', val: eaten.protein, goal: goal.protein, color: c.diet.protein },
    { label: 'Carbs', val: eaten.carbs, goal: goal.carbs, color: c.diet.carbs },
    { label: 'Fat', val: eaten.fat, goal: goal.fat, color: c.diet.fat },
  ];
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <LinearGradient colors={[c.hero.from, c.hero.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.energy} accessible accessibilityLabel={`${fmt(eaten.kcal)} of ${fmt(goal.kcal)} kilocalories eaten, ${fmt(Math.abs(left))} ${over ? 'over' : 'left'}`}>
            <View style={styles.eyebrowRow}><Flame size={14} color={c.hero.accent} /><Text style={[styles.eyebrow, { color: c.hero.accent }]}>DAILY FUEL</Text></View>
            <Text style={[styles.big, { color: c.hero.text }]}>{fmt(Math.abs(left))}</Text>
            <Text style={[styles.unit, { color: c.hero.muted }]}>{over ? 'kcal over' : 'kcal left'}</Text>
          </View>
          {!compact ? <ContourArt subject="nutrition" width={100} height={80} /> : null}
        </View>
        <View style={[styles.track, { backgroundColor: c.hero.line }]} accessibilityRole="progressbar" accessibilityLabel="Daily calories" accessibilityValue={{ min: 0, max: goal.kcal, now: Math.min(eaten.kcal, goal.kcal), text: `${fmt(eaten.kcal)} of ${fmt(goal.kcal)} kcal eaten` }}>
          <View style={[styles.fill, { backgroundColor: c.hero.accent, width: `${frac * 100}%` }]} />
        </View>
        <View style={styles.energyMeta}>
          <Text style={[styles.meta, { color: c.hero.muted }]}><Text style={{ color: c.hero.text, fontFamily: type.weight.bold }}>{fmt(eaten.kcal)}</Text> eaten</Text>
          {burned ? (
            <Text style={[styles.meta, { color: c.hero.muted }]} accessibilityLabel={`${fmt(burned)} kilocalories burned`}>
              <Text style={{ color: c.hero.text, fontFamily: type.weight.bold }}>{fmt(burned)}</Text> burned
            </Text>
          ) : null}
          <Pressable testID="diet-edit-goals" onPress={onEditGoals} disabled={!onEditGoals} hitSlop={10} accessibilityRole="button"
            accessibilityLabel={`Calorie goal ${fmt(goal.kcal)} kilocalories. Edit goals`} style={styles.goalLink}>
            <Text style={[styles.meta, { color: c.hero.muted }]}>Goal <Text style={{ color: c.hero.text, fontFamily: type.weight.bold }}>{fmt(goal.kcal)}</Text> kcal</Text>
            {onEditGoals ? <Pencil size={12} color={c.hero.accent} /> : null}
          </Pressable>
        </View>
      </LinearGradient>
      <View style={[styles.macros, fontScale > 1.4 && styles.stackMacros]}>
        {macros.map((m) => (
          <View key={m.label} style={styles.macro} accessible accessibilityLabel={`${m.label}: ${Math.round(m.val)} of ${Math.round(m.goal)} grams, ${Math.abs(Math.round(m.goal - m.val))} grams ${m.goal >= m.val ? 'left' : 'over'}`}>
            <Text style={[styles.macroLabel, { color: c.mutedText }]}>{m.label}</Text>
            <Text style={[styles.macroVal, { color: c.text }]}>{Math.round(m.val)}<Text style={[styles.macroGoal, { color: c.mutedText }]}> / {Math.round(m.goal)} g</Text></Text>
            <View style={[styles.track, { backgroundColor: c.diet.track }]}><View style={[styles.fill, { backgroundColor: m.color, width: `${m.goal > 0 ? Math.min(m.val / m.goal, 1) * 100 : 0}%` }]} /></View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hero: { padding: 18, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  energy: { flex: 1, gap: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.8 },
  big: { fontFamily: type.weight.extrabold, fontSize: 46, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.medium, fontSize: 14 },
  bowl: { width: 108, height: 108, transform: [{ rotate: '-12deg' }] },
  energyMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  meta: { fontFamily: type.weight.medium, fontSize: 12 },
  goalLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  macros: { flexDirection: 'row', gap: 18, padding: 18, paddingVertical: 16 },
  stackMacros: { flexDirection: 'column' },
  macro: { flex: 1, gap: 7 },
  macroLabel: { fontFamily: type.weight.medium, fontSize: 12 },
  macroVal: { fontFamily: type.weight.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  macroGoal: { fontFamily: type.weight.medium, fontSize: 11 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
