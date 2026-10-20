import { fetchWithAuth } from '@/src/lib/api';
import type { WorkoutPlanWithDays } from '@/src/lib/api/workoutPlans';
import { localDateKey } from '@/src/lib/api/workoutSessions';

/** Daily nutrition + weekly training-burn targets (backend internal/fitplan). */
export interface PlanTargets {
  bmr: number;
  tdee: number;
  calories: number;
  adjustment_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  burn_per_session_kcal: number;
  burn_weekly_kcal: number;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface PlanSchedule {
  days_per_week: number;
  session_min: number;
  preferred_days: Weekday[];
  preferred_time: TimeOfDay;
  reminder_hour: number;
  reminder_minute: number;
  split: 'full_body' | 'upper_lower' | 'push_pull_legs';
  /** False when preferred_days were suggested, not picked by the user. */
  days_chosen: boolean;
}

export interface PlanGuidance {
  avoid_moves: string[] | null;
  safe_moves: string[] | null;
  avoid_foods: string[] | null;
  eat_more: string[] | null;
}

export interface StarterExercise {
  exercise_uuid: string;
  title: string;
  tracking_type: string;
  target_sets: number | null;
  target_reps: number | null;
  target_duration_sec: number | null;
  rest_seconds: number | null;
}

export interface StarterDay {
  title: string;
  notes: string;
  estimated_duration_min: number;
  exercises: StarterExercise[] | null;
}

export interface StarterProgram {
  title: string;
  description: string;
  goal: string;
  days: StarterDay[] | null;
}

export interface PlanProgramRef {
  id: string;
  title: string;
  source: string;
}

export interface Plan {
  /** Answers the targets need but the user hasn't given: weight | height | dob. */
  missing: string[];
  targets: PlanTargets | null;
  schedule: PlanSchedule;
  guidance: PlanGuidance;
  today: { date: string; weekday: Weekday; training_day: boolean };
  starter_program: StarterProgram;
  starter_plan: PlanProgramRef | null;
  active_plan: PlanProgramRef | null;
  diet_defaults: { goal: string; activity_level: string; diet_type?: string };
  profile: { goal: string; experience: string; location: string; injuries: string[] | null };
}

/** Targets, schedule, guidance and a starter program preview from the onboarding answers. */
export async function getPlan(): Promise<Plan> {
  return fetchWithAuth(`/plan?date=${localDateKey(new Date())}`);
}

/** Saves the starter program (replacing an earlier one) and makes it the active plan. */
export async function createStarterProgram(): Promise<WorkoutPlanWithDays> {
  return fetchWithAuth('/plan/starter-program', { method: 'POST' });
}
