import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Dial } from '@/src/features/cardio/machines';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** One console setting: what to set now, what's next, and − / + for "too hard, too easy". */
export function DialCard({ dial, value, next, onNudge, testID }: { dial: Dial; value: number; next: number | null; onNudge: (dir: 1 | -1) => void; testID: string }) {
  const c = useThemeColors();
  const changing = next != null && next !== value;
  const button = (dir: 1 | -1, Icon: typeof Plus) => (
    <Pressable testID={`${testID}-${dir > 0 ? 'up' : 'down'}`} onPress={() => onNudge(dir)} hitSlop={4} accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Raise' : 'Lower'} ${dial.label.toLowerCase()} from now on`}
      style={({ pressed }) => [styles.btn, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
      <Icon size={22} color={c.text} />
    </Pressable>
  );
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.mutedText }]}>{dial.label}</Text>
      <View style={styles.valueRow} accessible accessibilityLabel={`${dial.label} ${value} ${dial.unit === 'level' ? '' : dial.unit}`}>
        <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {dial.unit !== 'level' ? <Text style={[styles.unit, { color: c.mutedText }]}>{dial.unit}</Text> : null}
      </View>
      <Text style={[styles.next, { color: changing ? c.accent : c.mutedText }]} numberOfLines={1}>{changing ? `Next ${next}` : 'Hold'}</Text>
      <View style={styles.btns}>{button(-1, Minus)}{button(1, Plus)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: 2 },
  label: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { flexShrink: 1, fontFamily: type.weight.extrabold, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.semibold, fontSize: 14 },
  next: { fontFamily: type.weight.semibold, fontSize: 13 },
  btns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
