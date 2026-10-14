import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useDietPlan, useDietSummary } from '../data/useDiet';
import { analyzeDays } from '../insights';
import { dateFromKey, fmt, goalsFromPlan, lastDays } from '../model';
import { SectionTitle } from '../ui/bits';
import { Segments } from '../ui/Segments';
import { CaloriesChart, MacroBalance, Pattern } from './InsightParts';

export function InsightsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const today = localDateKey(new Date());
  const range = lastDays(today, 7);
  const { plan } = useDietPlan(user?.id);
  const { summary, offline } = useDietSummary(user?.id, range[0], today);
  const goal = goalsFromPlan(plan);
  const r = summary ? analyzeDays(summary.days, goal, today) : null;
  const span = `${dateFromKey(range[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${dateFromKey(today).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Diet" subtitle={`Last 7 days · ${span}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Segments options={['Today', 'Insights']} selected={1} onSelect={(i) => i === 0 && router.back()} />
        {!summary || !r ? (
          offline ? <Text style={[styles.note, { color: c.mutedText }]}>Insights load once you’re connected.</Text> : <ActivityIndicator color={c.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.tiles}>
              <Tile label="Avg intake" value={r.avgKcal !== null ? fmt(r.avgKcal) : '—'}
                note={r.pctOfGoal !== null ? `${r.pctOfGoal}% of goal` : 'Log a full day'} tone={r.pctOfGoal !== null && r.pctOfGoal > 110 ? c.diet.over : c.mutedText} />
              <Tile label="Avg protein" value={r.avgProtein !== null ? `${r.avgProtein} g` : '—'} note={goal ? `Goal ${Math.round(goal.protein)} g` : ''} tone={c.mutedText} />
              <Tile label="Logging" value={`${summary.streak_days} ${summary.streak_days === 1 ? 'day' : 'days'}`} note="in a row" tone={c.accent} />
            </View>
            {goal ? <CaloriesChart days={summary.days} goal={goal.kcal} today={today} /> : null}
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
        )}
      </ScrollView>
    </View>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]} accessible accessibilityLabel={`${label}: ${value}. ${note}`}>
      <Text style={[styles.tileLabel, { color: c.mutedText }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.tileNote, { color: tone }]} numberOfLines={1}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base + 4, paddingTop: spacing.sm, paddingBottom: spacing['3xl'], gap: spacing.base },
  loader: { marginTop: spacing['3xl'] },
  note: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
  tile: { flex: 1, borderRadius: radii.lg + 2, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  tileLabel: { fontFamily: type.weight.semibold, fontSize: 12 },
  tileValue: { fontFamily: type.weight.extrabold, fontSize: 20 },
  tileNote: { fontFamily: type.weight.semibold, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14 },
});
