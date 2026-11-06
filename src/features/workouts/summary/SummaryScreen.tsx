import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, Trophy, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompletionHero } from '@/src/components/ui/CompletionHero';
import { CompletionMetrics } from '@/src/features/completion/CompletionMetrics';
import { CompletionRewards } from '@/src/features/completion/CompletionRewards';
import { ScreenEdgeFade } from '@/src/components/ui/ScreenEdgeFade';
import { useRoutines, useWorkoutHistory } from '@/src/features/workouts/hooks';
import type { ShareCardData } from '@/src/features/share/cardData';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ShareCardSheet } from '@/src/features/share/ShareCardSheet';
import { useSessionDetail } from '@/src/features/workouts/history/useSessionDetail';
import { sessionCardData } from '@/src/features/workouts/history/workoutCard';
import { describeSet, fmtClock, fmtKm, fmtVolume, plural, workoutXp } from '@/src/features/workouts/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { GritCard } from '@/src/features/workouts/summary/GritCard';
import { BottomBar, Button, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { routineFromSession } from '@/src/lib/api/routines';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

/** "Workout complete" — the reward after Finish. */
export function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const space = useBottomBarSpace();
  const { user } = useAuth();
  const { isOffline } = useOfflineAware();
  const d = useSessionDetail(sessionId);
  const history = useWorkoutHistory();
  const routines = useRoutines();
  const metrics = useRetentionMetrics(user?.id);
  const [saving, setSaving] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [card, setCard] = useState<ShareCardData | null>(null);
  const s = d.session;
  const routine = s?.plan_id ? routines.data?.find((r) => r.id === s.plan_id) : undefined;
  const self = history.data?.find((h) => h.id === s?.id);
  const name = routine?.title ?? self?.plan_name ?? 'Workout';
  const previous = s?.plan_id ? history.data?.find((h) => h.plan_id === s.plan_id && h.id !== s.id && h.status === 'completed' && h.started_at < s.started_at) : undefined;
  const t = d.totals;
  const change = previous && previous.total_volume_kg > 0 && t.volumeKg > 0 ? Math.round(((t.volumeKg - previous.total_volume_kg) / previous.total_volume_kg) * 100) : null;
  const xp = s ? workoutXp(s.total_duration_sec, t.volumeKg) : 0;
  const prLogs = d.logs.filter((l) => l.is_pr);

  const done = () => router.dismissTo('/workouts');

  const share = () => {
    if (s) setCard(sessionCardData(name, { ...d, session: s }));
  };

  const saveRoutine = async () => {
    if (isOffline) { toast('You’re offline — try again when connected', 'error'); return; }
    setSaving(true);
    try {
      const r = await routineFromSession(sessionId);
      setSavedAs(r.title);
      if (routines.data) routines.setData([r, ...routines.data]);
      toast(`Saved as “${r.title}”`, 'success');
    } catch (e: any) {
      toast(e?.status === 409 ? 'You have 30 routines. Delete one first.' : 'Couldn’t save the routine', 'error');
    } finally {
      setSaving(false);
    }
  };

  // A skeleton that mirrors the hero + stat grid, so saving the session and
  // loading its totals doesn't flash a bare full-screen spinner.
  if (d.loading && !s) return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + spacing.base }]}>
        <Skeleton height={240} radius={28} />
        <View style={styles.grid}>
          <Skeleton width="48%" height={84} radius={radii.lg} />
          <Skeleton width="48%" height={84} radius={radii.lg} />
          <Skeleton width="48%" height={84} radius={radii.lg} />
          <Skeleton width="48%" height={84} radius={radii.lg} />
        </View>
        <Skeleton height={120} radius={radii.lg} />
      </View>
    </View>
  );

  if (!s && d.error) return (
    <View style={[styles.flex, { backgroundColor: c.background, paddingTop: insets.top + 24, paddingHorizontal: 20, gap: 16 }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>Your session summary</Text>
      <Text style={[styles.line, { color: c.mutedText }]}>We couldn’t load your results. Try again to see your workout.</Text>
      <Button title="Try again" onPress={() => void d.reload()} style={styles.noFlex} />
      <Button title="Back to workouts" variant="quiet" onPress={done} style={styles.noFlex} />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.base, paddingBottom: space }]}>
        <CompletionHero variant="workout" eyebrow="Workout complete" title={name}
          subtitle={s ? new Date(s.started_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}
          metric={t.volumeKg > 0 ? { value: fmtVolume(t.volumeKg), unit: 'kg', label: 'Total volume lifted' } : { value: fmtClock(s?.total_duration_sec ?? 0), label: 'Training time' }} seed={sessionId}>
          <CompletionMetrics items={[
            t.volumeKg > 0 ? { label: 'Training time', value: fmtClock(s?.total_duration_sec ?? 0) } : { label: 'Exercises', value: String(d.groups.length) },
            { label: 'Sets completed', value: String(t.sets) },
            ...(t.distanceM > 0 ? [{ label: 'Distance', value: fmtKm(t.distanceM), unit: 'km' }] : []),
            ...(s?.kcal != null ? [{ label: 'Energy burned', value: s.kcal.toLocaleString('en-IN'), unit: 'kcal' }] : []),
          ]} />
        </CompletionHero>

        <CompletionRewards screen="workout" seed={sessionId} xp={xp} streak={Math.max(1, metrics.streakDays ?? 1)} />

        {prLogs.length ? (
          <View style={[styles.card, { backgroundColor: c.parts.shoulders.bg }]}>
            <View style={styles.row}><Trophy size={22} color={c.parts.shoulders.fg} /><Text style={[styles.cardTitle, { color: c.text }]}>New personal bests</Text></View>
            {prLogs.map((l) => (
              <Text key={l.id} style={[styles.line, { color: c.text }]}>
                {d.exercises[l.exercise_uuid]?.title ?? 'Exercise'} — <Text style={styles.bold}>{describeSet(d.typeOf(l.exercise_uuid), l)}</Text>
              </Text>
            ))}
          </View>
        ) : null}

        {change != null ? (
          <View style={[styles.card, styles.row, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
            {change >= 0 ? <TrendingUp size={24} color={c.accent} /> : <TrendingDown size={24} color={c.mutedText} />}
            <Text style={[styles.line, styles.flex, { color: c.text }]}>
              {change > 0 ? `${change}% more volume than last ${name}` : change === 0 ? `Same volume as last ${name}` : `${-change}% less than last ${name} — lighter days count too`}
            </Text>
          </View>
        ) : null}

        <View style={styles.breakdown}>
          <View style={styles.sectionHead}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Session breakdown</Text>
            <Text style={[styles.meta, { color: c.mutedText }]}>{plural(d.groups.length, 'exercise')}</Text>
          </View>
          {d.groups.map((g) => (
            <View key={g.uuid} style={[styles.exRow, { borderTopColor: c.border }]}><ExerciseThumb exercise={g.exercise} size={44} />
              <View style={styles.flex}>
                <Text style={[styles.line, { color: c.text }]} numberOfLines={2}>{g.exercise?.title ?? 'Exercise'}</Text>
                <Text style={[styles.setDetails, { color: c.mutedText }]} numberOfLines={2}>{g.logs.map(l => describeSet(d.typeOf(g.uuid), l)).join(' · ')}</Text>
              </View>
              <Text style={[styles.meta, { color: c.mutedText }]}>{plural(g.logs.length, 'set')}</Text>
            </View>
          ))}
        </View>

        <GritCard session={s} compact />

        {!s?.plan_id && d.logs.length ? (
          savedAs ? <Text style={[styles.line, { color: c.accent, textAlign: 'center' }]}>Saved as routine “{savedAs}” ✓</Text>
            : <Button variant="secondary" title="Save as routine" loading={saving} onPress={saveRoutine} style={styles.noFlex} />
        ) : null}
      </ScrollView>

      <BottomBar>
        <Button variant="secondary" title="Share" icon={<Share2 size={20} color={c.text} />} onPress={share} style={styles.noFlex} />
        <Button testID="summary-done" title="Done" onPress={done} />
      </BottomBar>
      <ShareCardSheet visible={card !== null} data={card} onClose={() => setCard(null)} />
      <ScreenEdgeFade edge="top" inset={insets.top} fade={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: -0.4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  breakdown: { paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { fontFamily: type.weight.medium, fontSize: 15, lineHeight: 22 },
  bold: { fontFamily: type.weight.bold },
  meta: { fontFamily: type.weight.medium, fontSize: 14 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  setDetails: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  noFlex: { flexGrow: 0 },
});
