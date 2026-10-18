import { ChartNoAxesCombined } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { DietSummary } from '@/src/lib/api/diet';
import { radii, spacing, type } from '@/src/styles/tokens';
import { analyzeDays } from '../insights';
import { fmt, type Macros } from '../model';
import { SectionTitle } from '../ui/bits';
import { CaloriesChart, MacroBalance, Pattern } from './InsightParts';

/** The Insights tab of the Diet screen: the last 7 days against the plan's goal. */
export function InsightsPanel({ summary, offline, goal, today }: {
  summary: DietSummary | null; offline: boolean; goal: Macros; today: string;
}) {
  const c = useThemeColors();
  if (!summary) {
    return offline
      ? <Text style={[styles.note, { color: c.mutedText }]}>Insights load once you’re connected.</Text>
      : <ActivityIndicator color={c.primary} style={styles.loader} />;
  }
  const r = analyzeDays(summary.days, goal, today);
  if (!summary.days.some((d) => d.meals > 0)) {
    return <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}><ChartNoAxesCombined size={32} color={c.accent} /></View>
      <Text style={[styles.heading, { color: c.text }]}>Small habits. A bigger picture.</Text>
      <Text style={[styles.note, { color: c.mutedText, textAlign: 'center' }]}>Start with one meal. Your weekly calorie trends, macro balance and most-loved foods will take shape here.</Text>
      <View style={[styles.hint, { backgroundColor: c.accentSoft }]}><Text style={[styles.hintText, { color: c.accent }]}>Tap Log food to begin</Text></View>
    </View>;
  }
  return (
    <>
      <View style={styles.intro}><Text style={[styles.heading, { color: c.text }]}>Your week, in focus.</Text><Text style={[styles.note, { color: c.mutedText }]}>Averages use logged days, excluding today.</Text></View>
      <View style={styles.tiles}>
        <Tile label="Avg intake" value={r.avgKcal !== null ? fmt(r.avgKcal) : '—'}
          note={r.pctOfGoal !== null ? `${r.pctOfGoal}% of goal` : 'Log a full day'} tone={r.pctOfGoal !== null && r.pctOfGoal > 110 ? c.diet.over : c.mutedText} />
        <Tile label="Avg protein" value={r.avgProtein !== null ? `${r.avgProtein} g` : '—'} note={`Goal ${Math.round(goal.protein)} g`} tone={c.mutedText} />
        <Tile label="Logging" value={`${summary.streak_days} ${summary.streak_days === 1 ? 'day' : 'days'}`} note="in a row" tone={c.accent} />
      </View>
      <CaloriesChart days={summary.days} goal={goal.kcal} today={today} />
      {r.split ? <MacroBalance you={r.split} target={r.targetSplit} /> : null}
      {r.weekendHigh || r.restDayProtein ? <SectionTitle title="What Filo noticed" /> : null}
      {r.weekendHigh ? (
        <Pattern icon="trend" title="Weekends run high"
          text={`Saturday and Sunday averaged ${fmt(r.weekendHigh.avgKcal)} kcal — ${r.weekendHigh.pctOver}% over your goal.`} />
      ) : null}
      {r.restDayProtein ? (
        <Pattern icon="training" title="Protein dips on rest days"
          text={`You averaged ${r.restDayProtein.rest} g on days without a workout and ${r.restDayProtein.training} g on training days.`} />
      ) : null}
      {r.loggedDays < 3 ? <Text style={[styles.note, { color: c.mutedText }]}>Log a few full days and Filo will start spotting patterns here.</Text> : null}
      {summary.top_foods.length ? (
        <>
          <SectionTitle title="Most logged" />
          <View style={styles.chips}>
            {summary.top_foods.map((f) => (
              <View key={f.name} style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.chipText, { color: c.text }]}>{f.name} <Text style={{ color: c.mutedText }}>×{f.count}</Text></Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]} accessible accessibilityLabel={`${label}: ${value}. ${note}`}>
      <Text style={[styles.tileLabel, { color: c.mutedText }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.tileNote, { color: tone }]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6, marginTop: 8, marginBottom: 4 },
  heading: { fontFamily: type.weight.extrabold, fontSize: 24, letterSpacing: -0.6 },
  empty: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', padding: 28, gap: 16, marginTop: 8 },
  emptyIcon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  hint: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, marginTop: 8 },
  hintText: { fontFamily: type.weight.semibold, fontSize: 13 },
  loader: { marginTop: spacing['3xl'] },
  note: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  tile: { flex: 1, minWidth: 90, borderRadius: radii.lg + 2, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  tileLabel: { fontFamily: type.weight.semibold, fontSize: 12 },
  tileValue: { fontFamily: type.weight.extrabold, fontSize: 20 },
  tileNote: { fontFamily: type.weight.semibold, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14 },
});
