import { useRouter } from 'expo-router';
import { ArrowUpRight, Droplet, Minus, Plus, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWaterToday } from '@/src/lib/water';
import { radii, spacing, type } from '@/src/styles/tokens';

const GLASS_ML = 250;

/** One actionable nudge from Filo, computed from the plan (no AI call). */
export function CoachTip({ shortG, onAction, onDismiss }: { shortG: number; onAction: () => void; onDismiss: () => void }) {
  const c = useThemeColors();
  return (
    <View style={[styles.tip, { backgroundColor: c.accentSoft }]} accessibilityRole="summary">
      <View style={[styles.tipIcon, { backgroundColor: c.primary }]}><Sparkles size={18} color={c.primaryText} /></View>
      <View style={styles.tipBody}>
        <Text style={[styles.tipText, { color: c.text }]}>
          <Text style={{ fontFamily: type.weight.bold }}>Filo: </Text>
          Today’s plan lands {shortG} g under your protein goal. Explore a snack to fill the gap.
        </Text>
        <View style={styles.tipActions}>
          <Pressable onPress={onAction} accessibilityRole="button" style={({ pressed }) => [styles.tipBtn, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.tipBtnText, { color: c.accent }]}>Find a protein snack</Text>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityRole="button" style={({ pressed }) => [styles.tipBtn, { borderWidth: 1, borderColor: c.border }, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.tipBtnText, { color: c.text }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Today's water, kept on the device by src/lib/water.ts (the same data as the Water screen). */
export function WaterCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { day, goalMl, totalMl, add, remove } = useWaterToday();
  const glasses = Math.min(12, Math.max(1, Math.round(goalMl / GLASS_ML)));
  const filled = Math.min(glasses, Math.floor(totalMl / GLASS_ML));
  const last = day.entries[day.entries.length - 1];
  const litres = (ml: number) => `${Math.round(ml / 50) / 20}`;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={() => router.push('/water')} accessibilityRole="button" accessibilityLabel={`Water, ${litres(totalMl)} of ${litres(goalMl)} litres. Open water history`} style={styles.waterHead}>
        <Droplet size={20} color={c.diet.water} />
        <Text style={[styles.cardTitle, { color: c.text }]}>Hydration</Text>
        <Text style={[styles.muted, { color: c.mutedText }]}>{litres(totalMl)} / {litres(goalMl)} L</Text>
        <ArrowUpRight size={18} color={c.mutedText} />
      </Pressable>
      <View style={styles.glasses} accessible={false}>
        {Array.from({ length: glasses }, (_, i) => (
          <View key={i} style={[styles.glass, { backgroundColor: i < filled ? c.diet.water : c.diet.track }]} />
        ))}
      </View>
      <View style={styles.waterActions}>
        <Pressable onPress={() => last && remove(last.id)} disabled={!last} accessibilityRole="button" accessibilityLabel="Remove the last glass"
          style={({ pressed }) => [styles.waterBtn, { borderColor: c.border, backgroundColor: c.surface }, !last && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
          <Minus size={18} color={c.text} />
        </Pressable>
        <Pressable onPress={() => add(GLASS_ML)} accessibilityRole="button" accessibilityLabel="Add a glass, 250 millilitres"
          style={({ pressed }) => [styles.waterBtn, styles.waterAdd, { borderColor: c.border, backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
          <Plus size={18} color={c.text} />
          <Text style={[styles.waterAddText, { color: c.text }]}>Glass · 250 ml</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { borderRadius: radii.xl, padding: spacing.base, flexDirection: 'row', gap: spacing.md },
  tipIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  tipBody: { flex: 1, gap: spacing.md - 2 },
  tipText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  tipActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  tipBtnText: { fontFamily: type.weight.semibold, fontSize: 14 },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  cardTitle: { fontFamily: type.weight.bold, fontSize: 16, flex: 1 },
  muted: { fontFamily: type.weight.regular, fontSize: 14 },
  waterHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 44 },
  glasses: { flexDirection: 'row', gap: 4 },
  glass: { flex: 1, height: 6, borderRadius: 3 },
  waterActions: { flexDirection: 'row', gap: spacing.sm },
  waterBtn: { minWidth: 48, minHeight: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  waterAdd: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  waterAddText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
