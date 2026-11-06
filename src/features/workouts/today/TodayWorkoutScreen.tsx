import { useRouter } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { partOf } from '@/src/features/workouts/model';
import { startWorkout } from '@/src/features/workouts/start';
import { AlternativesSheet } from '@/src/features/workouts/today/AlternativesSheet';
import { itemFromExercise, toPlanned } from '@/src/features/workouts/today/model';
import { saveTodayRun } from '@/src/features/workouts/today/store';
import { TodayItemCard } from '@/src/features/workouts/today/TodayItemCard';
import { useTodayWorkout } from '@/src/features/workouts/today/useTodayWorkout';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TodayItem } from '@/src/lib/api/todayWorkout';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { spacing, type } from '@/src/styles/tokens';

export function TodayWorkoutScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const { activeSession, setActiveSession } = useWorkout();
  const today = useTodayWorkout();
  const bottomSpace = useBottomBarSpace();
  const [takenFor, setTakenFor] = useState<TodayItem | null>(null);
  const [browseFor, setBrowseFor] = useState<TodayItem | null>(null);
  const [starting, setStarting] = useState(false);
  const plan = today.plan;
  const uuids = plan?.items.map((it) => it.exercise_uuid) ?? [];

  const start = async () => {
    if (!plan) return;
    if (activeSession) return router.push(`/workouts/session/${activeSession.id}`);
    setStarting(true);
    try {
      await startWorkout({}, { router, setActiveSession }, {
        beforeOpen: (s) => saveTodayRun({ sessionId: s.id, title: plan.title, items: plan.items.map(toPlanned) }),
      });
      today.clear();
    } catch {
      toast('We couldn’t start the workout. Check your connection and try again.', 'error');
    } finally {
      setStarting(false);
    }
  };
  const somethingElse = async () => {
    if (!(await today.somethingElse())) toast('Couldn’t build another one. Check your connection and try again.', 'error');
  };
  const swap = (was: TodayItem, next: TodayItem, name: string) => {
    today.replace(was.exercise_uuid, next);
    toast(`Swapped to ${name}`);
  };

  const body = () => {
    if (today.loading && !plan) return <View style={styles.pad}><Text style={[styles.reason, { color: c.mutedText }]}>Looking at your training…</Text><ContentSkeleton variant="list" label="Building today’s workout" /></View>;
    if (!plan) {
      return (
        <View testID="today-failed" style={styles.center}>
          <Text style={[styles.title, { color: c.text, textAlign: 'center' }]}>Can’t build it right now</Text>
          <Text style={[styles.reason, { color: c.mutedText, textAlign: 'center' }]}>This needs a connection the first time each day. Your routines still work offline.</Text>
          <Button testID="today-retry" title="Try again" onPress={today.retry} style={styles.selfButton} />
        </View>
      );
    }
    if (!plan.items.length) {
      return <View style={styles.center}><Text style={[styles.reason, { color: c.mutedText, textAlign: 'center' }]}>Nothing to suggest yet. Start an empty workout and log what you do, and this learns from it.</Text></View>;
    }
    return (
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: bottomSpace + spacing.base }]} testID="today-scroll">
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header" testID="today-title">{plan.title}</Text>
        <Text style={[styles.reason, { color: c.text }]}>{plan.reason}</Text>
        <Text style={[styles.meta, { color: c.mutedText }]}>About {plan.minutes} min · {plan.items.length} exercises</Text>
        {plan.tip ? (
          <View style={[styles.tip, { backgroundColor: c.surface }]}>
            <Lightbulb size={18} color={c.accent} />
            <Text style={[styles.tipText, { color: c.text }]}>{plan.tip}</Text>
          </View>
        ) : null}
        <View style={styles.list}>
          {plan.items.map((it) => <TodayItemCard key={it.exercise_uuid} item={it} onMachineTaken={() => setTakenFor(it)} />)}
        </View>
        <Text style={[styles.foot, { color: c.mutedText }]}>Numbers come from your own log. Change any of them as you go.</Text>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title="Today’s workout" />
      <View style={styles.flex}>{body()}</View>
      {plan?.items.length ? (
        <BottomBar>
          {activeSession ? null : <Button testID="today-else" variant="secondary" title="Something else" loading={today.loading} onPress={somethingElse} style={styles.action} />}
          <Button testID="today-start" title={activeSession ? 'Open your workout' : 'Start workout'} loading={starting} disabled={today.loading} onPress={start} style={styles.action} />
        </BottomBar>
      ) : null}

      <AlternativesSheet exercise={takenFor?.exercise ?? null} exclude={uuids} onClose={() => setTakenFor(null)}
        onBrowse={() => { setBrowseFor(takenFor); setTakenFor(null); }}
        onPick={(next) => { if (takenFor) swap(takenFor, next, next.exercise.title); setTakenFor(null); }} />
      <ExercisePicker visible={!!browseFor} mode="single" onClose={() => setBrowseFor(null)} title="Swap exercise"
        subtitle={browseFor ? `Instead of ${browseFor.exercise.title}` : undefined} addedUuids={uuids}
        initialPart={browseFor ? partOf(browseFor.exercise) : null} emptyLabel="Pick one" confirmLabel={() => 'Swap'}
        onConfirm={(p) => { if (browseFor && p[0]) swap(browseFor, itemFromExercise(p[0], browseFor), p[0].title); setBrowseFor(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.base, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: type.weight.extrabold, fontSize: 30 },
  reason: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 23 },
  meta: { fontFamily: type.weight.medium, fontSize: 14 },
  tip: { flexDirection: 'row', gap: spacing.sm, borderRadius: 14, padding: spacing.md, marginTop: spacing.xs },
  tipText: { flex: 1, fontFamily: type.weight.regular, fontSize: 15, lineHeight: 21 },
  list: { gap: spacing.md, marginTop: spacing.md },
  foot: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: spacing.md },
  action: { flexBasis: 0, paddingHorizontal: spacing.sm },
  selfButton: { flexGrow: 0, alignSelf: 'stretch' },
});
