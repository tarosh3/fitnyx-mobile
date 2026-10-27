import type { Goals, GoalsUpdate } from '@/src/lib/api/goals';
import type { ProgressDay } from '@/src/lib/api/progress';
import type { HealthToday } from '@/src/lib/health';

export type GoalKind = 'distance' | 'burn' | 'steps';

/** One day's activity toward the goals: Roam distance + steps, calories from Roams and workouts. */
export interface DayActivity {
  distanceM: number;
  kcal: number;
  steps: number;
}

export const NO_ACTIVITY: DayActivity = { distanceM: 0, kcal: 0, steps: 0 };

/**
 * Folds today's health-store totals (all-day steps / active energy from the
 * phone or watch) into the server day. Takes the larger of the two per metric,
 * so the goal never shows less than what the app already counted and the two
 * sources are never summed (no double-counting). Distance stays app-only.
 */
export function withHealthToday(day: DayActivity, health: HealthToday): DayActivity {
  return {
    distanceM: day.distanceM,
    steps: health.steps != null ? Math.max(day.steps, health.steps) : day.steps,
    kcal: health.activeKcal != null ? Math.max(day.kcal, health.activeKcal) : day.kcal,
  };
}

interface GoalMeta {
  field: keyof GoalsUpdate;
  label: string;
  /** Stepper step and quick picks, in the stored unit (metres / kcal / steps). */
  step: number;
  presets: number[];
  /** Offered first when the goal is switched on. */
  initial: number;
  min: number;
  max: number;
}

export const GOAL_KINDS: GoalKind[] = ['distance', 'burn', 'steps'];

export const GOAL_META: Record<GoalKind, GoalMeta> = {
  distance: { field: 'daily_distance_m', label: 'Distance', step: 500, presets: [3000, 5000, 10000, 21100], initial: 5000, min: 500, max: 100000 },
  burn: { field: 'daily_burn_kcal', label: 'Calories', step: 50, presets: [200, 300, 500, 800], initial: 400, min: 50, max: 5000 },
  steps: { field: 'daily_steps', label: 'Steps', step: 500, presets: [4000, 6000, 8000, 10000], initial: 6000, min: 500, max: 100000 },
};

export interface ActivityGoal {
  kind: GoalKind;
  target: number;
}

/** The activity goals that are set, in display order. */
export function activityGoals(goals: Goals | null | undefined): ActivityGoal[] {
  if (!goals) return [];
  return GOAL_KINDS.flatMap((kind) => {
    const target = goals[GOAL_META[kind].field];
    return target && target > 0 ? [{ kind, target }] : [];
  });
}

export function goalValue(kind: GoalKind, day: DayActivity): number {
  return kind === 'distance' ? day.distanceM : kind === 'burn' ? day.kcal : day.steps;
}

/** 0…1 (capped). */
export function goalFraction(target: number, value: number): number {
  return target > 0 ? Math.min(Math.max(value / target, 0), 1) : 0;
}

export type Milestone = 'half' | 'done';

/** "distance:half" — what a tracker remembers it already announced. */
export const milestoneId = (kind: GoalKind, m: Milestone) => `${kind}:${m}`;

/**
 * Milestones the day has reached that aren't in `announced` yet. A goal that
 * just got done reports only 'done' (its 'half' is implied).
 */
export function newMilestones(goals: ActivityGoal[], day: DayActivity, announced: string[]): { kind: GoalKind; milestone: Milestone }[] {
  return goals.flatMap(({ kind, target }): { kind: GoalKind; milestone: Milestone }[] => {
    const v = goalValue(kind, day);
    if (v >= target) return announced.includes(milestoneId(kind, 'done')) ? [] : [{ kind, milestone: 'done' }];
    if (v >= target / 2 && !announced.includes(milestoneId(kind, 'half'))) return [{ kind, milestone: 'half' }];
    return [];
  });
}

/** Every milestone the day has reached (announced or not). */
export function reachedMilestones(goals: ActivityGoal[], day: DayActivity): string[] {
  return goals.flatMap(({ kind, target }) => {
    const v = goalValue(kind, day);
    return [...(v >= target / 2 ? [milestoneId(kind, 'half')] : []), ...(v >= target ? [milestoneId(kind, 'done')] : [])];
  });
}

export function addActivity(a: DayActivity, b: DayActivity): DayActivity {
  return { distanceM: a.distanceM + b.distanceM, kcal: a.kcal + b.kcal, steps: a.steps + b.steps };
}

export function activityFromProgress(row: ProgressDay | undefined): DayActivity {
  if (!row) return NO_ACTIVITY;
  return { distanceM: row.distance_m, kcal: row.kcal_burned ?? 0, steps: row.steps ?? 0 };
}

/** "3.2 km" · "312 kcal" · "6,000 steps" (withUnit=false drops the unit). */
export function formatGoal(kind: GoalKind, value: number, withUnit = true): string {
  if (kind === 'distance') {
    const km = value / 1000;
    const text = Number.isInteger(km) ? String(km) : km.toFixed(1);
    return withUnit ? `${text} km` : text;
  }
  const text = Math.round(value).toLocaleString('en-IN');
  return withUnit ? `${text} ${kind === 'burn' ? 'kcal' : 'steps'}` : text;
}
