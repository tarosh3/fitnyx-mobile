import { Droplet, Dumbbell, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DietDayTotals } from '@/src/lib/api/diet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { dateFromKey, dayStatus, fmt } from '../model';

const CHART_H = 170;

/** Calories per day against the goal line; today is outlined (still in progress). */
export function CaloriesChart({ days, goal, today }: { days: DietDayTotals[]; goal: number; today: string }) {
  const c = useThemeColors();
  const max = Math.max(goal * 1.3, ...days.map((d) => d.kcal));
  const goalY = Math.round((goal / max) * CHART_H);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.head}>
        <Text style={[styles.h2, { color: c.text }]} accessibilityRole="header">Calories</Text>
        <Text style={[styles.muted, { color: c.mutedText }]}>Goal {fmt(goal)} kcal</Text>
      </View>
      <View style={styles.chart}>
        <View style={[styles.goalLine, { bottom: goalY + 20, borderColor: c.mutedText }]} />
        {days.map((d) => {
          const isToday = d.date === today;
          const status = dayStatus(d.kcal, d.meals, goal);
          const fill = isToday ? 'transparent' : status === 'over' ? c.diet.over : status === 'none' ? c.diet.track : c.primary;
          const label = isToday ? 'Today' : dateFromKey(d.date).toLocaleDateString('en-GB', { weekday: 'short' });
          return (
            <View key={d.date} style={styles.col} accessible
              accessibilityLabel={`${label}: ${d.meals ? `${fmt(d.kcal)} kcal${isToday ? ' so far' : status === 'over' ? ', over goal' : status === 'hit' ? ', on target' : ', under goal'}` : 'nothing logged'}`}>
              <Text style={[styles.value, { color: c.mutedText }]}>{d.meals ? (d.kcal >= 1000 ? `${(d.kcal / 1000).toFixed(1)}k` : d.kcal) : ''}</Text>
              <View style={[styles.bar, { height: Math.max(4, Math.round((d.kcal / max) * CHART_H)), backgroundColor: fill },
                isToday && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.mutedText }]} />
              <Text style={[styles.day, { color: isToday ? c.text : c.mutedText }]}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={c.primary} label="Within 10% of goal" />
        <Legend color={c.diet.over} label="Over" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: c.mutedText }]}>{label}</Text>
    </View>
  );
}

type Split = { protein: number; carbs: number; fat: number };

/** Average share of calories by macro vs the plan's target. */
export function MacroBalance({ you, target }: { you: Split; target: Split | null }) {
  const c = useThemeColors();
  const bar = (s: Split, soft: boolean) => (
    <View style={styles.split}>
      {([['protein', c.diet.protein], ['carbs', c.diet.carbs], ['fat', c.diet.fat]] as const).map(([k, color]) => (
        <View key={k} style={[styles.seg, { flex: Math.max(s[k], 1), backgroundColor: soft ? c.surface : color, borderColor: color, borderWidth: soft ? 1.5 : 0 }]}>
          <Text style={[styles.segText, { color: soft ? color : c.card }]}>{s[k]}%</Text>
        </View>
      ))}
    </View>
  );
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.h2, { color: c.text }]} accessibilityRole="header">Macro balance</Text>
      <View accessible accessibilityLabel={`You: ${you.protein}% protein, ${you.carbs}% carbs, ${you.fat}% fat`} style={styles.splitBlock}>
        <Text style={[styles.label, { color: c.text }]}>You, on average</Text>{bar(you, false)}
      </View>
      {target ? (
        <View accessible accessibilityLabel={`Target: ${target.protein}% protein, ${target.carbs}% carbs, ${target.fat}% fat`} style={styles.splitBlock}>
          <Text style={[styles.label, { color: c.text }]}>Your plan’s target</Text>{bar(target, true)}
        </View>
      ) : null}
      <View style={styles.legend}>
        <Legend color={c.diet.protein} label="Protein" /><Legend color={c.diet.carbs} label="Carbs" /><Legend color={c.diet.fat} label="Fat" />
      </View>
    </View>
  );
}

const ICONS = { trend: TrendingUp, training: Dumbbell, water: Droplet } as const;

export function Pattern({ icon, title, text }: { icon: keyof typeof ICONS; title: string; text: string }) {
  const c = useThemeColors();
  const Icon = ICONS[icon];
  const tone = icon === 'trend' ? c.diet.slots.breakfast : icon === 'training' ? c.diet.slots.lunch : c.diet.slots.dinner;
  return (
    <View style={[styles.pattern, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.patternIcon, { backgroundColor: tone.bg }]}><Icon size={20} color={tone.fg} /></View>
      <View style={styles.grow}>
        <Text style={[styles.label, { color: c.text }]}>{title}</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.base },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h2: { fontFamily: type.weight.extrabold, fontSize: 18 },
  muted: { fontFamily: type.weight.regular, fontSize: 13 },
  chart: { height: CHART_H + 44, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  value: { fontFamily: type.weight.bold, fontSize: 11 },
  bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  day: { fontFamily: type.weight.semibold, fontSize: 12, height: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: type.weight.semibold, fontSize: 12 },
  splitBlock: { gap: 6 },
  label: { fontFamily: type.weight.bold, fontSize: 15 },
  split: { flexDirection: 'row', height: 28, gap: 2, borderRadius: radii.sm, overflow: 'hidden' },
  seg: { alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: type.weight.bold, fontSize: 12 },
  pattern: { flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth },
  patternIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 4 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
});
