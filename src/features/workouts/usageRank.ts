import type { ExerciseUsage } from '@/src/lib/api/exercises';
import { partOf, type Part } from '@/src/features/workouts/model';
import type { Exercise } from '@/src/types/exercise';

export type UsageSort = 'frequent' | 'az';

/**
 * How much a muscle group being trained recently demotes its exercises. You
 * won't retrain chest the day after chest day, so same/next-day groups sink and
 * recovered (3+ days) groups rank at full weight.
 */
export function recoveryWeight(daysAgo: number | null): number {
  if (daysAgo == null) return 1; // unknown / long ago → fully available
  if (daysAgo <= 1) return 0.2; // trained today or yesterday → recovering
  if (daysAgo === 2) return 0.5; // still easing back
  return 1; // 3+ days → recovered, you're due
}

function score(i: ExerciseUsage, part: Part | null): number {
  // An explicit part filter means the user asked for this part — rank by raw
  // frequency. The default (no filter) view folds in recovery.
  return part ? i.sessions : i.sessions * recoveryWeight(i.group_days_ago);
}

/**
 * Rank the user's logged exercises for the picker, frequency-first. With a part
 * filter, only that part's exercises, by frequency. Without one, every logged
 * exercise scored by frequency × recovery so the groups you're due for rise.
 */
export function rankUsage(items: ExerciseUsage[], part: Part | null): ExerciseUsage[] {
  const scoped = part ? items.filter((i) => i.part === part) : items.slice();
  return scoped.sort((a, b) => {
    const d = score(b, part) - score(a, part);
    if (d !== 0) return d;
    const t = (b.last_used ?? '').localeCompare(a.last_used ?? ''); // newer first
    if (t !== 0) return t;
    return (a.exercise.title ?? '').localeCompare(b.exercise.title ?? '');
  });
}

/**
 * The part to keep suggesting from the exercises in a workout, without the server
 * (offline, or until its answer arrives): the part of the last strength exercise.
 * A cardio warm-up says nothing about the muscle being trained.
 */
export function localFocusPart(exercises: Partial<Pick<Exercise, 'primary_muscles' | 'tracking_type'>>[]): Part | null {
  for (let i = exercises.length - 1; i >= 0; i--) {
    const p = partOf(exercises[i]);
    if (p !== 'cardio') return p;
  }
  return null;
}

/** Why a part is being suggested, in the user's terms. Null when there's nothing to say. */
export function focusReason(f: { current_part: string; part: string; streak: number; switched: boolean; seen: number; of: number }, label: (part: string) => string): string | null {
  // "2 leg exercises", "leg days": the part as a word in front of a noun.
  const before = (part: string) => label(part).toLowerCase().replace(/s$/, '');
  if (!f.switched) return f.seen >= 2 ? `What you usually do next on ${before(f.part)} days` : null;
  const after = `${f.streak} ${before(f.current_part)} exercise${f.streak === 1 ? '' : 's'}`;
  return `You usually move to ${label(f.part).toLowerCase()} after ${after} (${f.seen} of ${f.of} times)`;
}

/** Order a plain exercise list alphabetically by title. */
export function sortAlphabetical<T extends { title?: string }>(exs: T[]): T[] {
  return exs.slice().sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
}
