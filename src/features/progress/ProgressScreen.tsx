import React, { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useBodyMetrics, useProgressDaily, useProgressStrength, useProgressSummary } from './data';
import {
  autoGran, bucketize, pctChange, previousRange, rangeTitle, resolveGran, resolveRange, spanDays, sumDays,
  type Gran, type RangeChoice,
} from './range';
import { Muted } from './ui/bits';
import { CustomRangeSheet } from './ui/CustomRangeSheet';
import { GranSwitch, RangeChips } from './ui/RangeBar';
import { BodyView } from './views/BodyView';
import { FuelView } from './views/FuelView';
import { OverviewView } from './views/OverviewView';
import { RoamView } from './views/RoamView';
import { StrengthView } from './views/StrengthView';

type Segment = 'overview' | 'strength' | 'roam' | 'body' | 'fuel';
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'strength', label: 'Strength' },
  { key: 'roam', label: 'Roam' },
  { key: 'body', label: 'Body' },
  { key: 'fuel', label: 'Fuel' },
];

const longDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** The Progress tab: one range (preset or custom, up to a year) drives every view. */
export function ProgressScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const workoutInset = useWorkoutOverlayInset();
  const scroll = useRef<ScrollView>(null);
  const { user } = useAuth();
  const userId = user?.id;
  const today = localDateKey(new Date());
  const [segment, setSegment] = useState<Segment>('overview');
  const [choice, setChoice] = useState<RangeChoice>({ preset: '7d' });
  const [requestedGran, setGran] = useState<Gran>('day');
  const [sheet, setSheet] = useState(false);

  const range = useMemo(() => resolveRange(choice, today), [choice, today]);
  const span = spanDays(range);
  const gran = resolveGran(requestedGran, span);
  const monthRange = useMemo(() => ({ from: `${today.slice(0, 7)}-01`, to: today }), [today]);

  const daily = useProgressDaily(userId, range);
  const month = useProgressDaily(userId, monthRange);
  const summary = useProgressSummary(userId);
  const strength = useProgressStrength(userId, range, segment === 'strength');
  const body = useBodyMetrics(userId, segment === 'body');
  const { dailyInsight } = useRetentionMetrics(userId);

  const days = daily.data?.days ?? [];
  const totals = sumDays(days, range);
  const prev = sumDays(days, previousRange(range));
  const buckets = useMemo(() => bucketize(days, range, gran, today), [days, range, gran, today]);
  const [refreshing, setRefreshing] = useState(false);

  const pick = (next: RangeChoice) => {
    setChoice(next);
    setGran(autoGran(spanDays(resolveRange(next, today))));
  };
  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([daily.refetch(), month.refetch(), summary.refetch(), segment === 'strength' ? strength.refetch() : null]);
    setRefreshing(false);
  };
  const common = { buckets, totals, span, gran };

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: bottomNavClearance(insets.bottom) + 32 + workoutInset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
        <View>
          <Text style={[styles.date, { color: c.mutedText }]}>{longDate(new Date())}</Text>
          <Text style={[styles.h1, { color: c.text }]} accessibilityRole="header">Progress</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segScroll} contentContainerStyle={styles.segs} accessibilityRole="tablist">
          {SEGMENTS.map((s) => {
            const on = s.key === segment;
            return (
              <Pressable key={s.key} testID={`progress-${s.key}`} onPress={() => setSegment(s.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={[styles.seg, { backgroundColor: on ? c.text : 'transparent', borderColor: on ? c.text : c.border }]}>
                <Text style={[styles.segText, { color: on ? c.background : c.text }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <RangeChips choice={choice} onPreset={pick} onCustom={() => setSheet(true)} />
        <View style={styles.rangeRow}>
          <Text style={[styles.rangeTitle, { color: c.text }]} numberOfLines={1}>{rangeTitle(choice, range)}</Text>
          {segment !== 'body' ? <GranSwitch value={gran} span={span} onChange={setGran} /> : null}
        </View>
        {daily.failed ? <Muted>Couldn't load your progress. Pull down to try again.</Muted> : null}

        {segment === 'overview' ? (
          <OverviewView {...common} change={pctChange(totals.workoutSec + totals.roamSec, prev.workoutSec + prev.roamSec)}
            summary={summary.data} monthDays={month.data?.days ?? []} today={today} insight={dailyInsight}
            onStrength={() => { setSegment('strength'); scroll.current?.scrollTo({ y: 0, animated: true }); }} />
        ) : null}
        {segment === 'strength' ? <StrengthView {...common} change={pctChange(totals.volumeKg, prev.volumeKg)} strength={strength.data} loading={strength.loading} /> : null}
        {segment === 'roam' ? <RoamView {...common} change={pctChange(totals.distanceM, prev.distanceM)} summary={summary.data} today={today} /> : null}
        {segment === 'body' ? <BodyView history={body.history} targetKg={body.targetKg} range={range} /> : null}
        {segment === 'fuel' ? <FuelView userId={userId} range={range} buckets={buckets} gran={gran} /> : null}
      </ScrollView>

      <CustomRangeSheet visible={sheet} initial={range} today={today} onClose={() => setSheet(false)}
        onApply={(r) => { pick({ custom: r }); setSheet(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  date: { fontFamily: type.weight.bold, fontSize: 11, letterSpacing: type.tracking.eyebrow, textTransform: 'uppercase' },
  h1: { fontFamily: type.weight.extrabold, fontSize: 34, letterSpacing: -0.6, marginTop: 4 },
  segScroll: { marginHorizontal: -spacing.base },
  segs: { gap: spacing.sm, paddingHorizontal: spacing.base },
  seg: { minHeight: 40, paddingHorizontal: spacing.base, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  segText: { fontFamily: type.weight.semibold, fontSize: 14 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, minHeight: 40 },
  rangeTitle: { flex: 1, fontFamily: type.weight.semibold, fontSize: 14 },
});
