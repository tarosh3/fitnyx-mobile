import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { fmt, macroSplit, type Macros } from '../model';

const SIZE = 196;
const STROKE = 14;
const R = 84;
const C = 2 * Math.PI * R;
const GAP = 4;

/** The meal as a plate: calories in the middle, the rim split by where they come from. */
export function MacroPlate({ macros }: { macros: Macros }) {
  const c = useThemeColors();
  const split = macroSplit(macros);
  const parts = split ? [
    { key: 'protein', pct: split.protein, color: c.diet.protein, label: 'protein' },
    { key: 'carbs', pct: split.carbs, color: c.diet.carbs, label: 'carbs' },
    { key: 'fat', pct: split.fat, color: c.diet.fat, label: 'fat' },
  ] : [];
  let offset = 0;
  const arcs = parts.map((p) => {
    const len = Math.max((C * p.pct) / 100 - GAP, 0);
    const arc = { ...p, len, offset };
    offset += len + GAP;
    return arc;
  });
  const label = split ? `${fmt(macros.kcal)} kcal: ${split.protein}% protein, ${split.carbs}% carbs, ${split.fat}% fat` : `${fmt(macros.kcal)} kcal`;
  return (
    <View style={styles.wrap}>
      <View style={[styles.plate, { backgroundColor: c.diet.plate }]} accessible accessibilityRole="image" accessibilityLabel={label}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          {arcs.map((a) => (
            <Circle key={a.key} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={a.color} strokeWidth={STROKE}
              strokeDasharray={`${a.len} ${C}`} strokeDashoffset={-a.offset} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
          ))}
        </Svg>
        <Text style={[styles.kcal, { color: c.text }]}>{fmt(macros.kcal)}</Text>
        <Text style={[styles.unit, { color: c.mutedText }]}>kcal</Text>
      </View>
      {split ? (
        <View style={styles.legend}>
          {parts.filter((p) => p.pct > 0).map((p) => (
            <View key={p.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={[styles.legendText, { color: c.text }]}>{p.pct}% {p.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14 },
  plate: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  kcal: { fontFamily: type.weight.extrabold, fontSize: 38, letterSpacing: -1 },
  unit: { fontFamily: type.weight.semibold, fontSize: 13 },
  legend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: type.weight.semibold, fontSize: 13 },
});
