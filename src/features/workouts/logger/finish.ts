import type { Block } from '@/src/features/workouts/logger/rows';
import { logToDraft, trackingOf } from '@/src/features/workouts/model';
import type { Routine, RoutineExerciseInput, RoutineInput } from '@/src/lib/api/routines';
import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';

/** Exercises with logged sets that the workout's routine doesn't have yet. */
export function extraBlocks(blocks: Block[], routine: Pick<Routine, 'exercises'> | null): Block[] {
  if (!routine) return [];
  const inRoutine = new Set(routine.exercises.map((e) => e.exercise_uuid));
  return blocks.filter((b) => b.logs.length > 0 && !inRoutine.has(b.uuid));
}

export const keepTargets = (e: WorkoutDayExercise): RoutineExerciseInput => ({
  exercise_uuid: e.exercise_uuid,
  target_sets: e.target_sets ?? undefined,
  target_reps: e.target_reps ?? undefined,
  target_weight_kg: e.target_weight_kg ?? undefined,
  target_duration_sec: e.target_duration_sec ?? undefined,
  target_distance_m: e.target_distance_m ?? undefined,
  rest_seconds: e.rest_seconds ?? undefined,
});

/** Targets for an exercise added today: what was done (sets, first working set). */
export function targetsFromBlock(b: Block): RoutineExerciseInput {
  const t = trackingOf(b.exercise);
  const first = logToDraft([...b.logs].sort((x, y) => x.set_index - y.set_index)[0]);
  return {
    exercise_uuid: b.uuid,
    target_sets: b.logs.length,
    target_reps: t === 'weight_reps' || t === 'reps' ? first.reps : undefined,
    target_weight_kg: first.weightKg > 0 ? first.weightKg : undefined,
    target_duration_sec: t === 'duration' || t === 'cardio' ? first.durationSec : undefined,
    target_distance_m: t === 'cardio' && first.distanceM > 0 ? first.distanceM : undefined,
  };
}

/** The routine as it is, plus today's extras at the end. */
export function routineWithExtras(routine: Routine, extras: Block[]): RoutineInput {
  return { title: routine.title, exercises: [...routine.exercises.map(keepTargets), ...extras.map(targetsFromBlock)] };
}
