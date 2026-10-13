import { type DraftSet, logToDraft, prefill, trackingOf } from '@/src/features/workouts/model';
import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import type { ExerciseLog } from '@/src/lib/api/workoutSessions';
import type { Exercise } from '@/src/types/exercise';

/** One exercise in the live workout. */
export interface Block {
  key: string;
  uuid: string;
  /** The routine/program row; null when the exercise was added during the workout. */
  planned: WorkoutDayExercise | null;
  exercise: Exercise | null;
  logs: ExerciseLog[];
  /** Planned-but-not-done rows beyond the target ("+ Add set"). Negative removes. */
  extraRows: number;
  /** Values the user changed on rows not logged yet, by pending index. */
  drafts: Record<number, DraftSet>;
  /** Top set last time this exercise was done (any workout). */
  last: Partial<DraftSet> | null;
  /** All-time best weight (kg), for "Best 80 kg". */
  bestKg: number | null;
}

export const defaultSetsFor = (ex: Exercise | null) => (trackingOf(ex) === 'cardio' ? 1 : 3);

export function pendingCount(b: Pick<Block, 'planned' | 'logs' | 'extraRows' | 'exercise'>): number {
  const target = b.planned ? b.planned.target_sets ?? defaultSetsFor(b.exercise) : 0;
  return Math.max(0, Math.max(0, target - b.logs.length) + b.extraRows);
}

/**
 * Values each not-yet-logged row shows. Row 1 follows the last set logged in
 * this workout, else the routine target, else last time; each later row
 * follows the row above it (so changing set 2 carries on to set 3).
 */
export function pendingRows(b: Block): DraftSet[] {
  const t = trackingOf(b.exercise);
  const logged = [...b.logs].sort((x, y) => x.set_index - y.set_index);
  let previous: DraftSet | null = logged.length ? logToDraft(logged[logged.length - 1]) : null;
  const out: DraftSet[] = [];
  for (let i = 0; i < pendingCount(b); i++) {
    const row = b.drafts[i] ?? prefill(t, b.planned, previous, b.last);
    out.push(row);
    previous = row;
  }
  return out;
}

export const blockDone = (b: Block) => b.logs.length > 0 && pendingCount(b) === 0;

export function nextSetNumber(logs: Pick<ExerciseLog, 'set_index'>[]): number {
  return logs.reduce((m, l) => Math.max(m, l.set_index), 0) + 1;
}

/** "Next: Bench Press · set 2 · 60 kg × 10" for the rest timer. */
export function nextUp(blocks: Block[], describe: (b: Block, d: DraftSet) => string): string | null {
  for (const b of blocks) {
    const rows = pendingRows(b);
    if (rows.length) return `${b.exercise?.title ?? 'Next exercise'} · set ${b.logs.length + 1} · ${describe(b, rows[0])}`;
  }
  return null;
}
