import { ExerciseFilters, ExerciseResponse, Exercise, TrackingType } from '@/src/types/exercise';
import { fetchWithAuth } from '@/src/lib/api';

export async function fetchExercises({ page = 1, limit = 20, search = '', muscle = '', equipment, is_warmup = false, fields, mine }: ExerciseFilters): Promise<ExerciseResponse> {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    muscle,
  });

  if (equipment) {
    query.append('equipment', equipment);
  }
  if (is_warmup) {
    query.append('is_warmup', 'true');
  }
  if (fields) {
    query.append('fields', fields);
  }
  if (mine) {
    query.append('mine', 'true');
  }

  return fetchWithAuth(`/view/exercises?${query.toString()}`);
}

export async function fetchExerciseByUUID(uuid: string): Promise<Exercise> {
  return fetchWithAuth(`/view/exercise/${uuid}`);
}

/** One exercise the user has logged, with the signals the picker ranks by. */
export interface ExerciseUsage {
  exercise: Exercise;
  /** Distinct workouts that logged this exercise. */
  sessions: number;
  last_used: string;
  /** Body part (chest/back/shoulders/arms/legs/core), or '' when unknown. */
  part: string;
  /** Days since this part was last trained; null when unknown. */
  group_days_ago: number | null;
}

/** The user's exercises ranked by use, with per-part recovery signals. */
export async function fetchExerciseUsage(): Promise<ExerciseUsage[]> {
  const res = (await fetchWithAuth(`/exercises/usage`)) as { data?: ExerciseUsage[] };
  return res?.data ?? [];
}

/** Exercises the user usually does alongside the given ones, most-paired first. */
export async function fetchExerciseSuggestions(current: string[]): Promise<Exercise[]> {
  if (!current.length) return [];
  const q = new URLSearchParams({ current: current.join(',') });
  const res = (await fetchWithAuth(`/exercises/suggestions?${q.toString()}`)) as { data?: Exercise[] };
  return res?.data ?? [];
}

// --- Custom exercises (one user's own; backend caps active ones at MAX_CUSTOM_EXERCISES) ---

export const MAX_CUSTOM_EXERCISES = 10;
export const CUSTOM_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Abs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Full body'] as const;
export const CUSTOM_EQUIPMENT = ['Barbell', 'Dumbbell', 'Kettlebell', 'Cable', 'Machine', 'Bodyweight', 'Band', 'Other'] as const;

export interface CustomExerciseInput {
  /** Made on the device, so an offline retry creates it once. */
  uuid: string;
  title: string;
  tracking_type: TrackingType;
  primary_muscle?: string;
  equipment?: string;
  /** Also ask for it to be added to the catalog for everyone. */
  suggest: boolean;
  note?: string;
}

/** 201 created / 200 already created (same uuid). 409 `code`: custom_limit | duplicate_title | uuid_taken. */
export async function createCustomExercise(input: CustomExerciseInput): Promise<Exercise> {
  return fetchWithAuth('/exercises/custom', { method: 'POST', body: JSON.stringify(input) });
}

/** Hides it from lists (past sets keep it) and withdraws a pending suggestion. */
export async function archiveCustomExercise(uuid: string): Promise<void> {
  await fetchWithAuth(`/exercises/custom/${uuid}`, { method: 'DELETE' });
}

// --- Per-exercise progress history (logged sets grouped by workout day) ---

export interface ExerciseHistorySet {
  set_index: number;
  reps: number;
  weight_kg: number | null;
  rpe?: number | null;
  /** Timed holds and cardio (servers from 2026-10-14 on). */
  duration_sec?: number | null;
  distance_m?: number | null;
}

export interface ExerciseHistoryDay {
  date: string; // YYYY-MM-DD
  session_id: string;
  sets: ExerciseHistorySet[];
  max_weight_kg: number | null;
  total_volume_kg: number;
  est_1rm_kg: number | null;
}

export interface ExerciseHistorySummary {
  best_weight_kg: number | null;
  best_est_1rm_kg: number | null;
  total_sessions: number;
  last_performed: string;
}

export interface ExerciseHistory {
  exercise_uuid: string;
  summary: ExerciseHistorySummary;
  days: ExerciseHistoryDay[];
}

export async function fetchExerciseHistory(uuid: string): Promise<ExerciseHistory> {
  return fetchWithAuth(`/workout-sessions/exercises/${uuid}/history`);
}
