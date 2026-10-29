import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { asLog, progressStats, shortDate } from '@/src/features/workouts/library/text';
import { describeSet } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type ExerciseHistory, fetchExerciseHistory } from '@/src/lib/api/exercises';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys, cacheTTL } from '@/src/lib/cache/keys';
import type { TrackingType } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

/** "My progress" on an exercise page: bests, a weight chart, and every day it was done. */
export function ExerciseProgress({ uuid, t }: { uuid: string; t: TrackingType }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const key = cacheKeys.exerciseHistory(uuid);
    idbGet<ExerciseHistory>(key).then((cached) => { if (alive && cached) { setHistory(cached); setLoading(false); } });
    fetchExerciseHistory(uuid)
      .then((fresh) => { if (alive) { setHistory(fresh); idbSet(key, fresh, cacheTTL.MEDIUM).catch(() => undefined); } })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uuid]);

  if (loading && !history) return <BrandLoader color={c.primary} style={styles.spinner} />;
  if (!history?.days.length) {
    return (
      <View style={[styles.empty, { backgroundColor: c.surface }]}>
        <Text style={[styles.emptyTitle, { color: c.text }]}>No history yet</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>Log this exercise in a workout and your progress shows up here.</Text>
      </View>
    );
  }

  const chart = t === 'weight_reps' ? history.days.filter((d) => d.max_weight_kg != null).map((d) => ({ value: d.max_weight_kg as number, label: shortDate(d.date) })) : [];
  const best = history.summary.best_weight_kg;
  return (
    <View style={styles.wrap}>
      <View style={styles.stats}>
        {progressStats(t, history).map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
          </View>
        ))}
      </View>
      {chart.length >= 2 ? (
        <View style={[styles.chart, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel={`Heaviest weight per workout, from ${chart[0].value} to ${chart[chart.length - 1].value} kilograms`}>
          <LineChart data={chart} color={c.primary} thickness={3} curved areaChart startFillColor={c.primary} endFillColor={c.primary}
            startOpacity={0.2} endOpacity={0.01} hideDataPoints={chart.length > 8} dataPointsColor={c.primary} hideRules
            yAxisColor="transparent" xAxisColor={c.border} yAxisTextStyle={{ color: c.mutedText, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: c.mutedText, fontSize: 11 }} noOfSections={3} width={width - 110} height={150} initialSpacing={8} endSpacing={8} />
        </View>
      ) : null}
      {[...history.days].reverse().map((d) => (
        <View key={d.session_id} style={[styles.day, { borderColor: c.border }]}>
          <View style={styles.dayHead}>
            <Text style={[styles.dayDate, { color: c.text }]}>{shortDate(d.date)}</Text>
            {t === 'weight_reps' && best != null && d.max_weight_kg === best ? (
              <View style={[styles.best, { backgroundColor: c.parts.shoulders.bg }]}>
                <Trophy size={14} color={c.parts.shoulders.fg} /><Text style={[styles.bestText, { color: c.parts.shoulders.fg }]}>Best</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.chips}>
            {d.sets.map((s, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: c.surface }]}>
                <Text style={[styles.chipText, { color: c.text }]}>{describeSet(t, asLog(s))}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: spacing.xl },
  wrap: { gap: spacing.md },
  empty: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  emptyTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 21 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 2 },
  statLabel: { fontFamily: type.weight.semibold, fontSize: 13 },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 20, fontVariant: ['tabular-nums'] },
  chart: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, overflow: 'hidden' },
  day: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md, gap: spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayDate: { fontFamily: type.weight.bold, fontSize: 16 },
  best: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  bestText: { fontFamily: type.weight.bold, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radii.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: 6 },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
});
