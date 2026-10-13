import { Check, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRoutines } from '@/src/features/workouts/hooks';
import { keepTargets } from '@/src/features/workouts/logger/finish';
import { plural, trackingOf } from '@/src/features/workouts/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type RoutineExerciseInput, updateRoutine } from '@/src/lib/api/routines';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Starting targets for an exercise added outside the editor. */
export function defaultTargets(ex: Exercise): RoutineExerciseInput {
  const t = trackingOf(ex);
  if (t === 'cardio') return { exercise_uuid: ex.uuid, target_sets: 1, target_duration_sec: 20 * 60 };
  if (t === 'duration') return { exercise_uuid: ex.uuid, target_sets: 3, target_duration_sec: 45 };
  return { exercise_uuid: ex.uuid, target_sets: 3, target_reps: t === 'reps' ? 12 : 10 };
}

export function AddToRoutineSheet({ visible, exercise, onStart, onClose }: { visible: boolean; exercise: Exercise; onStart: () => void; onClose: () => void }) {
  const c = useThemeColors();
  const toast = useToast();
  const routines = useRoutines();
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = routines.data ?? [];

  const add = async (id: string) => {
    const r = list.find((x) => x.id === id);
    if (!r) return;
    setBusyId(id);
    try {
      const updated = await updateRoutine(r.id, { title: r.title, exercises: [...r.exercises.map(keepTargets), defaultTargets(exercise)] });
      routines.setData(list.map((x) => (x.id === id ? updated : x)));
      toast(`Added to ${r.title}`);
      onClose();
    } catch {
      toast('Couldn’t add it. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet visible={visible} title={`Add ${exercise.title}`} subtitle="Pick a routine, or just do it now" onClose={onClose}
      footer={<Button title="Start a workout with it" onPress={onStart} />}>
      {routines.loading ? <ActivityIndicator color={c.primary} /> : null}
      {!routines.loading && !list.length ? <Text style={[styles.empty, { color: c.mutedText }]}>No routines yet. Start a workout with it, then save that workout as a routine.</Text> : null}
      <View style={styles.list}>
        {list.map((r) => {
          const has = r.exercises.some((e) => e.exercise_uuid === exercise.uuid);
          return (
            <Pressable key={r.id} onPress={() => add(r.id)} disabled={has || !!busyId} accessibilityRole="button"
              accessibilityLabel={has ? `${r.title}, already has it` : `Add to ${r.title}`} accessibilityState={{ disabled: has }}
              style={({ pressed }) => [styles.row, { borderColor: c.border }, pressed && { backgroundColor: c.surface }]}>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: c.text }]}>{r.title}</Text>
                <Text style={[styles.meta, { color: c.mutedText }]}>{plural(r.exercises.length, 'exercise')}</Text>
              </View>
              {busyId === r.id ? <ActivityIndicator color={c.primary} />
                : has ? <View style={styles.tag}><Check size={18} color={c.accent} /><Text style={[styles.meta, { color: c.accent }]}>Added</Text></View>
                  : <View style={[styles.plus, { backgroundColor: c.accentSoft }]}><Plus size={20} color={c.accent} /></View>}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radii.lg },
  empty: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1 },
  title: { fontFamily: type.weight.semibold, fontSize: 17 },
  meta: { fontFamily: type.weight.medium, fontSize: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
