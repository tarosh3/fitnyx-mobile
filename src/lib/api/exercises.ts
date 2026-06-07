import { ExerciseFilters, ExerciseResponse, Exercise } from '@/src/types/exercise';
import { fetchWithAuth } from '@/src/lib/api';

export async function fetchExercises({ page = 1, limit = 20, search = '', muscle = '', is_warmup = false }: ExerciseFilters): Promise<ExerciseResponse> {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    muscle,
  });

  if (is_warmup) {
    query.append('is_warmup', 'true');
  }

  return fetchWithAuth(`/view/exercises?${query.toString()}`);
}

export async function fetchExerciseByUUID(uuid: string): Promise<Exercise> {
  return fetchWithAuth(`/view/exercise/${uuid}`);
}

// --- Per-exercise progress history (logged sets grouped by workout day) ---

export interface ExerciseHistorySet {
  set_index: number;
  reps: number;
  weight_kg: number | null;
  rpe?: number | null;
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
