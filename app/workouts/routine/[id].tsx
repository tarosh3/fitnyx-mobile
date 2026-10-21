import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Clock, Pencil, Play, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRoutines } from '@/src/features/workouts/hooks';
import { describeTarget, partOf, plural, trackingOf } from '@/src/features/workouts/model';
import { startWorkout } from '@/src/features/workouts/start';
import { estMinutes } from '@/src/features/workouts/train/TrainHero';
import { BottomBar, Button, IconButton, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { PartChip, Pill } from '@/src/features/workouts/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { deleteRoutine, getRoutine, type Routine } from '@/src/lib/api/routines';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

export default function RoutineScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const space = useBottomBarSpace();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routines = useRoutines();
  const { activeSession, setActiveSession } = useWorkout();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const cached = routines.data?.find((r) => r.id === id);
    if (cached) setRoutine(cached);
  }, [routines.data, id]);
  useEffect(() => {
    getRoutine(id).then(setRoutine).catch(() => undefined);
  }, [id]);

  if (!routine) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <TopBar title="Routine" />
        <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={c.primary} />
      </View>
    );
  }

  const parts = Array.from(new Set(routine.exercises.map((e) => partOf(e.exercise))));
  const start = async () => {
    if (activeSession) return router.push(`/workouts/session/${activeSession.id}`);
    setStarting(true);
    try {
      await startWorkout({ planId: routine.id, dayId: routine.day_id }, { router, setActiveSession });
    } catch {
      toast('We couldn’t start the workout. Check your connection and try again.', 'error');
    } finally {
      setStarting(false);
    }
  };
  const remove = async () => {
    try {
      await deleteRoutine(routine.id);
      routines.setData((routines.data ?? []).filter((r) => r.id !== routine.id));
      setConfirmDelete(false);
      toast(`Deleted “${routine.title}”`);
      router.back();
    } catch {
      toast('Couldn’t delete. Check your connection and try again.', 'error');
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title={routine.title} subtitle="Routine" right={
        <IconButton label={`Edit ${routine.title}`} onPress={() => router.push(`/workouts/routine/edit?id=${routine.id}`)}>
          <Pencil size={20} color={c.text} />
        </IconButton>
      } />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]}>
        <View style={styles.chips}>
          {parts.map((p) => <PartChip key={p} part={p} />)}
          <Pill><View style={styles.pillRow}><Clock size={13} color={c.mutedText} /><Text style={[styles.pillText, { color: c.mutedText }]}>About {estMinutes(routine)} min</Text></View></Pill>
        </View>
        <Text style={[styles.section, { color: c.text }]}>{plural(routine.exercises.length, 'exercise')}</Text>
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
          {routine.exercises.map((e, i) => (
            <Pressable key={e.id} onPress={() => router.push(`/workouts/exercise/${e.exercise_uuid}`)} accessibilityRole="button"
              accessibilityLabel={`${e.exercise?.title ?? 'Exercise'}, ${describeTarget(trackingOf(e.exercise), e)}. How to do it`}
              style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
              <ExerciseThumb exercise={e.exercise} />
              <View style={styles.grow}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{e.exercise?.title ?? 'Exercise'}</Text>
                <Text style={[styles.meta, { color: c.mutedText }]}>{describeTarget(trackingOf(e.exercise), e)}</Text>
              </View>
              <BookOpen size={20} color={c.mutedText} />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.hint, { color: c.mutedText }]}>Tap an exercise to see how to do it.</Text>
        <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.delete}>
          <Trash2 size={18} color={c.destructive} /><Text style={[styles.deleteText, { color: c.destructive }]}>Delete routine</Text>
        </Pressable>
      </ScrollView>
      <BottomBar>
        <Button testID="routine-start" title={activeSession ? 'Resume open workout' : 'Start workout'} loading={starting} onPress={start}
          icon={<Play size={20} color={c.primaryText} fill={c.primaryText} />} />
      </BottomBar>
      <Sheet visible={confirmDelete} title={`Delete “${routine.title}”?`} subtitle="Your past workouts stay in History." onClose={() => setConfirmDelete(false)}
        footer={<><Button title="Delete routine" variant="danger" onPress={remove} /><Button title="Keep it" variant="secondary" onPress={() => setConfirmDelete(false)} /></>}>
        <View />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillText: { fontFamily: type.weight.semibold, fontSize: 13 },
  section: { fontFamily: type.weight.extrabold, fontSize: 21, marginTop: spacing.lg, marginBottom: spacing.md },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 80 },
  grow: { flex: 1, minWidth: 0 },
  name: { fontFamily: type.weight.bold, fontSize: 16 },
  meta: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: type.weight.regular, fontSize: 13, marginTop: spacing.sm },
  delete: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, marginTop: spacing.lg, alignSelf: 'flex-start' },
  deleteText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
