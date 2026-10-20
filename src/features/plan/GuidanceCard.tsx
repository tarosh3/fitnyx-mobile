import { Ban, Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { PlanGuidance } from '@/src/lib/api/plan';
import { radii, spacing, type } from '@/src/styles/tokens';

function List({ title, items, good }: { title: string; items: string[] | null; good?: boolean }) {
  const c = useThemeColors();
  if (!items?.length) return null;
  const Icon = good ? Check : Ban;
  return (
    <View style={styles.list}>
      <Text style={[styles.h, { color: c.text }]} accessibilityRole="header">{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <Icon size={16} color={good ? c.accent : c.warning} style={styles.icon} />
          <Text style={[styles.body, { color: c.mutedText }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** What to eat more of, and the moves and foods to go easy on. */
export function GuidanceCard({ guidance }: { guidance: PlanGuidance }) {
  const c = useThemeColors();
  return (
    <View testID="plan-guidance" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <List title="Eat more" items={guidance.eat_more} good />
      <List title="Go easy on" items={guidance.avoid_foods} />
      <List title="Skip these moves for now" items={guidance.avoid_moves} />
      <List title="Safer swaps" items={guidance.safe_moves} good />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.lg },
  list: { gap: spacing.sm },
  h: { fontFamily: type.weight.bold, fontSize: 16 },
  item: { flexDirection: 'row', gap: spacing.sm },
  icon: { marginTop: 3 },
  body: { flex: 1, fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
});
