import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePrograms } from '@/src/features/workouts/hooks';
import { describeTarget, plural, trackingOf } from '@/src/features/workouts/model';
import { goalLabel, trainingDays } from '@/src/features/workouts/programs/ProgramCard';
import { startWorkout } from '@/src/features/workouts/start';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { Pill } from '@/src/features/workouts/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { retentionMetricsKey } from '@/src/hooks/queryKeys';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { activateWorkoutPlan, getWorkoutPlan, type WorkoutPlanWithDays } from '@/src/lib/api/workoutPlans';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

/** One program: its week, day by day, and Start. */
export function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const space = useBottomBarSpace();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const metrics = useRetentionMetrics(user?.id);
  const programs = usePrograms();
  const { activeSession, setActiveSession } = useWorkout();
  const [program, setProgram] = useState<WorkoutPlanWithDays | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const cached = programs.data?.find((p) => p.id === id);
    if (cached) setProgram(cached);
  }, [programs.data, id]);
  // The user's own copy of a program (what Home links to) isn't in the catalog list.
  useEffect(() => {
    if (programs.data?.some((p) => p.id === id)) return;
    getWorkoutPlan(String(id)).then((p) => setProgram(p as WorkoutPlanWithDays)).catch(() => undefined);
  }, [id, !!programs.data]);

  if (!program) {
    return <View style={[styles.flex, { backgroundColor: c.background }]}><TopBar title="Program" /><BrandLoader style={styles.spinner} color={c.primary} /></View>;
  }

  const days = [...(program.days ?? [])].sort((a, b) => a.day_index - b.day_index);
  const active = metrics.activePlan?.title === program.title;
  const replacing = metrics.activePlan && !active ? metrics.activePlan.title : null;
  const firstOpen = openDay ?? (active ? metrics.currentDay?.id : days.find((d) => !d.is_rest_day)?.id) ?? null;

  const startProgram = async () => {
    setBusy(true);
    try {
      await activateWorkoutPlan(program.id);
      await queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user?.id) });
      setConfirm(false);
      toast(`${program.title} started — today’s workout is on Train`, 'success');
      router.dismissTo('/workouts');
    } catch {
      toast('Couldn’t start the program. Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const startToday = async () => {
    if (activeSession) { router.push(`/workouts/session/${activeSession.id}`); return; }
    if (!metrics.activePlan || !metrics.currentDay) return;
    setBusy(true);
    try {
      await startWorkout({ planId: metrics.activePlan.id, dayId: metrics.currentDay.id }, { router, setActiveSession });
    } catch {
      toast('We couldn’t start the workout. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title={program.title} subtitle="Program" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]}>
        <View style={styles.chips}>
          <Pill>{`${trainingDays(program)}× a week`}</Pill>
          <Pill>{goalLabel(program.goal)}</Pill>
          {active ? <Pill tone="ok">Your program</Pill> : null}
        </View>
        {program.description ? <Text style={[styles.body, { color: c.mutedText }]}>{program.description}</Text> : null}
        <Text style={[styles.h, { color: c.text }]}>Your week</Text>
        {days.map((d) => {
          const open = d.id === firstOpen;
          const exercises = d.exercises ?? [];
          const name = d.title || `Day ${d.day_index}`;
          return (
            <View key={d.id} style={[styles.day, { backgroundColor: c.card, borderColor: active && d.id === metrics.currentDay?.id ? c.primary : c.border }]}>
              <Pressable onPress={() => setOpenDay(open ? '' : d.id)} disabled={d.is_rest_day} accessibilityRole="button" accessibilityState={{ expanded: open }}
                accessibilityLabel={`Day ${d.day_index}: ${d.is_rest_day ? 'rest' : `${name}, ${plural(exercises.length, 'exercise')}`}`} style={styles.dayHead}>
                <View style={[styles.dayNum, { backgroundColor: d.is_rest_day ? c.surface : c.accentSoft }]}>
                  <Text style={[styles.dayNumText, { color: d.is_rest_day ? c.mutedText : c.accent }]}>{d.day_index}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.dayTitle, { color: c.text }]}>{d.is_rest_day ? 'Rest day 💤' : name}</Text>
                  {!d.is_rest_day ? <Text style={[styles.meta, { color: c.mutedText }]}>{plural(exercises.length, 'exercise')}{active && d.id === metrics.currentDay?.id ? ' · Today' : ''}</Text> : null}
                </View>
                {!d.is_rest_day ? (open ? <ChevronUp size={22} color={c.mutedText} /> : <ChevronDown size={22} color={c.mutedText} />) : null}
              </Pressable>
              {open ? exercises.map((e) => (
                <Pressable key={e.id} onPress={() => router.push(`/workouts/exercise/${e.exercise_uuid}`)} accessibilityRole="button"
                  accessibilityLabel={`${e.exercise?.title ?? 'Exercise'}, ${describeTarget(trackingOf(e.exercise), e)}`} style={styles.ex}>
                  <ExerciseThumb exercise={e.exercise} size={44} />
                  <View style={styles.flex}>
                    <Text style={[styles.exName, { color: c.text }]} numberOfLines={2}>{e.exercise?.title ?? 'Exercise'}</Text>
                    <Text style={[styles.meta, { color: c.mutedText }]}>{describeTarget(trackingOf(e.exercise), e)}</Text>
                  </View>
                </Pressable>
              )) : null}
            </View>
          );
        })}
      </ScrollView>
      <BottomBar>
        {active ? <Button testID="program-today" title="Start today’s workout" loading={busy} icon={<Play size={20} color={c.primaryText} fill={c.primaryText} />} onPress={startToday} />
          : <Button testID="program-start" title="Start this program" loading={busy} onPress={() => (replacing ? setConfirm(true) : startProgram())} />}
      </BottomBar>
      <Sheet visible={confirm} title={`Switch to ${program.title}?`} subtitle={`This replaces ${replacing ?? 'your program'}.`} onClose={() => setConfirm(false)}
        footer={<><Button title="Switch program" loading={busy} onPress={startProgram} /><Button variant="secondary" title="Keep my program" onPress={() => setConfirm(false)} /></>}>
        <Text style={[styles.body, { color: c.mutedText }]}>Your history and routines stay as they are.</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  spinner: { marginTop: spacing['3xl'] },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 23 },
  h: { fontFamily: type.weight.extrabold, fontSize: 21, marginTop: spacing.sm },
  day: { borderRadius: radii.xl, borderWidth: 1.5, padding: spacing.md, gap: spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  dayNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontFamily: type.weight.extrabold, fontSize: 16 },
  dayTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  meta: { fontFamily: type.weight.medium, fontSize: 14 },
  ex: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  exName: { fontFamily: type.weight.semibold, fontSize: 16 },
});
