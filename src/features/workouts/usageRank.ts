import type { ExerciseUsage } from '@/src/lib/api/exercises';
import type { Part } from '@/src/features/workouts/model';

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

/** Order a plain exercise list alphabetically by title. */
export function sortAlphabetical<T extends { title?: string }>(exs: T[]): T[] {
  return exs.slice().sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
}
