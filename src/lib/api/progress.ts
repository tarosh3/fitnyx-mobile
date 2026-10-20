import { fetchWithAuth } from '@/src/lib/api';
import { localDateKey } from '@/src/lib/api/workoutSessions';

/** One local date's totals; the server only returns dates with a workout or a Roam. */
export interface ProgressDay {
  date: string;
  workouts: number;
  workout_sec: number;
  volume_kg: number;
  sets: number;
  roams: number;
  roam_sec: number;
  distance_m: number;
  /** Estimated calories from workouts + Roams. Absent from older backends. */
  kcal_burned?: number;
  /** Pedometer steps taken during Roams. Absent from older backends. */
  steps?: number;
}

export interface ProgressDaily {
  from: string;
  to: string;
  days: ProgressDay[];
}

export interface MuscleSets {
  group: string;
  sets: number;
}

export interface LiftTrend {
  exercise_uuid: string;
  name: string;
  sets: number;
  points: { date: string; e1rm_kg: number }[];
}

export interface ProgressStrength {
  from: string;
  to: string;
  muscles: MuscleSets[];
  lifts: LiftTrend[];
}

export interface LiftRecord {
  exercise_uuid: string;
  name: string;
  e1rm_kg: number;
  weight_kg: number;
  reps: number;
  date: string;
  sets: number;
}

export interface Effort {
  km: number;
  sec: number;
  date: string;
  activity_id: string;
}

export interface RoamRecord {
  value: number;
  date: string;
  activity_id: string;
}

export interface ProgressSummary {
  streak: { current_weeks: number; best_weeks: number; this_week: boolean };
  lifetime: { workouts: number; volume_kg: number; roams: number; distance_m: number };
  records: {
    lifts: LiftRecord[];
    efforts: Effort[];
    longest_roam: RoamRecord | null;
    most_climb: RoamRecord | null;
  };
}

/** Per-date totals for from..to (at most two years: a range plus the one before it). */
export async function fetchProgressDaily(from: string, to: string): Promise<ProgressDaily> {
  return fetchWithAuth(`/progress/daily?${new URLSearchParams({ from, to }).toString()}`);
}

/** Sets per muscle group and the e1RM trend of the most-trained lifts (at most a year). */
export async function fetchProgressStrength(from: string, to: string): Promise<ProgressStrength> {
  return fetchWithAuth(`/progress/strength?${new URLSearchParams({ from, to }).toString()}`);
}

/** Weekly streak (as of the local today), lifetime totals and all-time records. */
export async function fetchProgressSummary(): Promise<ProgressSummary> {
  return fetchWithAuth(`/progress/summary?date=${localDateKey(new Date())}`);
}
