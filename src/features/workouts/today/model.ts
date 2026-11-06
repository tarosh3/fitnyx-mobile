import { fmtCardioTime, fmtClock, fmtKg, fmtMetres, partOf, trackingOf } from '@/src/features/workouts/model';
import type { TodayItem, TodayWorkout } from '@/src/lib/api/todayWorkout';
import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import type { Exercise } from '@/src/types/exercise';

/** The target in one line: "3 × 8 · 62.5 kg", "3 × 8 · 20 kg help", "3 × 0:45", "10 min". */
export function targetLine(it: TodayItem): string {
  const t = trackingOf(it.exercise);
  if (t === 'cardio') {
    const time = fmtCardioTime(it.duration_sec ?? 600);
    return it.distance_m ? `${time} · ${fmtMetres(it.distance_m)}` : time;
  }
  const load = it.weight_kg != null && it.weight_kg > 0 ? `${fmtKg(it.weight_kg)} kg` : null;
  if (t === 'duration') return `${it.sets} × ${fmtClock(it.duration_sec ?? 45)}${load ? ` · ${load}` : ''}`;
  if (t === 'weight_distance') return `${it.sets} × ${fmtMetres(it.distance_m ?? 20)}${load ? ` · ${load}` : ''}`;
  const sets = `${it.sets} × ${it.reps ?? 10}`;
  if (t === 'assisted_reps') return it.assist_kg != null ? `${sets} · ${it.assist_kg > 0 ? `${fmtKg(it.assist_kg)} kg help` : 'no help'}` : sets;
  if (t === 'reps') return load ? `${sets} · ${load}` : sets;
  return `${sets} · ${load ?? 'pick a weight'}`;
}

/** Only something with equipment can be "taken". */
export function takenLabel(e: Exercise | null | undefined): string {
  const kit = e?.equipment ?? [];
  return kit.length && !kit.every((k) => /bodyweight/i.test(k.name)) ? 'Machine taken?' : 'Swap this one';
}

/** The logger's plan row for a target. An assisted exercise's target weight is its assistance. */
export function toPlanned(it: TodayItem, order: number): WorkoutDayExercise {
  return {
    id: `today-${it.exercise_uuid}`,
    day_id: '',
    exercise_uuid: it.exercise_uuid,
    exercise_order: order,
    target_sets: it.sets,
    target_reps: it.reps,
    target_weight_kg: trackingOf(it.exercise) === 'assisted_reps' ? it.assist_kg : it.weight_kg,
    rest_seconds: it.rest_sec,
    target_duration_sec: it.duration_sec,
    target_distance_m: it.distance_m,
    created_at: '',
    exercise: it.exercise,
  };
}

/** An exercise the user chose themselves: the same amount of work, and no invented weight. */
export function itemFromExercise(e: Exercise, was: { sets?: number; reps?: number; rest_sec?: number }): TodayItem {
  const t = trackingOf(e);
  const base = {
    exercise_uuid: e.uuid, part: partOf(e), sets: was.sets ?? 3, rest_sec: was.rest_sec,
    kind: 'first' as const, note: 'Your pick. Use what feels right today', exercise: e,
  };
  if (t === 'cardio') return { ...base, sets: 1, rest_sec: 0, duration_sec: 600 };
  if (t === 'duration') return { ...base, duration_sec: 45 };
  if (t === 'weight_distance') return { ...base, distance_m: 20 };
  return { ...base, reps: was.reps ?? 10 };
}

/** The plan row after swapping to an exercise the user chose: keeps the row's sets, reps and rest. */
export function plannedForSwap(e: Exercise, row: WorkoutDayExercise): WorkoutDayExercise {
  return toPlanned(itemFromExercise(e, { sets: row.target_sets, reps: row.target_reps, rest_sec: row.rest_seconds }), row.exercise_order);
}

/** The coach's tip may be about the exercise that's going, so it goes too. */
export function replaceItem(plan: TodayWorkout, uuid: string, next: TodayItem): TodayWorkout {
  return { ...plan, tip: undefined, items: plan.items.map((it) => (it.exercise_uuid === uuid ? next : it)) };
}

/** Parts to skip after "something else". Back to none once the server has started over. */
export function nextSkip(asked: string[], got: Pick<TodayWorkout, 'parts'>): string[] {
  return got.parts.some((p) => asked.includes(p)) ? [] : asked;
}
