import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { fmt, type Macros } from '../model';

const SIZE = 136;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Calories left (the number people decide with), what's eaten, and each macro's grams left. */
export function SummaryCard({ eaten, goal }: { eaten: Macros; goal: Macros }) {
  const c = useThemeColors();
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
      <View style={styles.top}>
        <View style={styles.ring} accessible accessibilityRole="image"
          accessibilityLabel={`${fmt(eaten.kcal)} of ${fmt(goal.kcal)} kilocalories eaten, ${fmt(Math.abs(left))} ${over ? 'over' : 'left'}`}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.diet.track} strokeWidth={STROKE} fill="none" />
            {frac > 0 ? (
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={over ? c.diet.over : c.primary} strokeWidth={STROKE} fill="none"
                strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
            ) : null}
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.big, { color: c.text }]}>{fmt(Math.abs(left))}</Text>
            <Text style={[styles.small, { color: c.mutedText }]}>{over ? 'kcal over' : 'kcal left'}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat label="Eaten" value={fmt(eaten.kcal)} />
          <View style={[styles.rule, { backgroundColor: c.border }]} />
          <Stat label="Daily goal" value={fmt(goal.kcal)} />
        </View>
      </View>
      <View style={styles.macros}>
        {macros.map((m) => {
          const rest = Math.round(m.goal - m.val);
          return (
            <View key={m.label} style={styles.macro} accessible
              accessibilityLabel={`${m.label}: ${Math.round(m.val)} of ${Math.round(m.goal)} grams, ${Math.abs(rest)} grams ${rest >= 0 ? 'left' : 'over'}`}>
              <View style={styles.macroHead}>
                <View style={[styles.swatch, { backgroundColor: m.color }]} />
                <Text style={[styles.macroLabel, { color: c.text }]}>{m.label}</Text>
              </View>
              <Text style={[styles.macroVal, { color: c.text }]}>{Math.round(m.val)}<Text style={{ color: c.mutedText, fontFamily: type.weight.medium }}> / {Math.round(m.goal)} g</Text></Text>
              <View style={[styles.track, { backgroundColor: c.diet.track }]}>
                <View style={[styles.fill, { backgroundColor: m.color, width: `${m.goal > 0 ? Math.min(m.val / m.goal, 1) * 100 : 0}%` }]} />
              </View>
              <Text style={[styles.left, { color: c.mutedText }]}>{rest >= 0 ? `${rest} g left` : `${-rest} g over`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.mutedText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.text }]}>{value} <Text style={[styles.statUnit, { color: c.mutedText }]}>kcal</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ring: { width: SIZE, height: SIZE },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: type.weight.extrabold, fontSize: 30, letterSpacing: -0.5 },
  small: { fontFamily: type.weight.medium, fontSize: 13 },
  stats: { flex: 1, gap: spacing.md },
  stat: { gap: 2 },
  statLabel: { fontFamily: type.weight.regular, fontSize: 13 },
  statValue: { fontFamily: type.weight.bold, fontSize: 20 },
  statUnit: { fontFamily: type.weight.medium, fontSize: 13 },
  rule: { height: StyleSheet.hairlineWidth },
  macros: { flexDirection: 'row', gap: spacing.md + 2 },
  macro: { flex: 1, gap: 6 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontFamily: type.weight.semibold, fontSize: 13 },
  macroVal: { fontFamily: type.weight.bold, fontSize: 15 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  left: { fontFamily: type.weight.regular, fontSize: 12 },
});
