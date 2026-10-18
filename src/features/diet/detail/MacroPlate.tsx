import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { fmt, type Macros } from '../model';

/** Portion-aware nutrition, with a readable label for each value. */
export function MacroPlate({ macros }: { macros: Macros }) {
  const c = useThemeColors();
  const { fontScale } = useWindowDimensions();
  const values = [
    { label: 'Calories', value: fmt(macros.kcal), unit: 'kcal', color: c.text },
    { label: 'Protein', value: fmt(macros.protein), unit: 'g', color: c.diet.protein },
    { label: 'Carbs', value: fmt(macros.carbs), unit: 'g', color: c.diet.carbs },
    { label: 'Fat', value: fmt(macros.fat), unit: 'g', color: c.diet.fat },
  ];
  return <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
    {values.map((v) => <View key={v.label} style={[styles.stat, fontScale > 1.2 && { flexBasis: '40%' }]} accessible accessibilityLabel={`${v.label}: ${v.value} ${v.unit}`}>
      <View style={[styles.dot, { backgroundColor: v.color }]} />
      <Text style={[styles.value, { color: c.text }]}>{v.value}<Text style={[styles.unit, { color: c.mutedText }]}> {v.unit}</Text></Text>
      <Text style={[styles.label, { color: c.mutedText }]}>{v.label}</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 14 },
  stat: { flexGrow: 1, flexBasis: 55, gap: 6 },
  dot: { width: 16, height: 3, borderRadius: 2, marginBottom: 3 },
  value: { fontFamily: type.weight.bold, fontSize: 20, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.medium, fontSize: 10 },
  label: { fontFamily: type.weight.medium, fontSize: 11 },
});
