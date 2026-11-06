import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

export function CompletionMetrics({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  const c = useThemeColors();
  const columns = items.length > 3 ? 2 : items.length;
  return <View style={styles.row}>{items.map((m, index) => <View key={m.label} style={[styles.metric, { flexBasis: items.length > 3 ? '40%' : 0 }, index % columns > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.border, paddingLeft: 16 }]} accessible accessibilityLabel={`${m.label}: ${m.value} ${m.unit ?? ''}`}>
    <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{m.value}{m.unit ? <Text style={[styles.unit, { color: c.mutedText }]}> {m.unit}</Text> : null}</Text>
    <Text style={[styles.label, { color: c.mutedText }]}>{m.label}</Text>
  </View>)}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 18 },
  metric: { flex: 1, minWidth: 0, gap: 5 },
  value: { fontFamily: type.weight.bold, fontSize: 23, letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.medium, fontSize: 14, letterSpacing: 0 },
  label: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 18 },
});
