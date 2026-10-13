import { fetchWithAuth } from '@/src/lib/api';
import type { WorkoutDayExercise } from './workoutPlans';

/** A saved single workout ("Push", "Abs") — backend /workout-routines. */
export interface Routine {
  id: string;
  title: string;
  /** The routine's single plan day; sessions start with plan_id = id, day_id = day_id. */
  day_id: string;
  /** YYYY-MM-DD of the last completed workout from this routine, or null. */
  last_done: string | null;
  created_at: string;
  updated_at: string;
  exercises: WorkoutDayExercise[];
}

export interface RoutineExerciseInput {
  exercise_uuid: string;
  target_sets?: number;
  target_reps?: number;
  target_weight_kg?: number;
  target_duration_sec?: number;
  target_distance_m?: number;
  rest_seconds?: number;
}

export interface RoutineInput {
  title: string;
  exercises: RoutineExerciseInput[];
}

export async function listRoutines(): Promise<Routine[]> {
  const res: { data?: Routine[] } = await fetchWithAuth('/workout-routines');
  return res?.data ?? [];
}

export function getRoutine(id: string): Promise<Routine> {
  return fetchWithAuth(`/workout-routines/${id}`);
}

export function createRoutine(input: RoutineInput): Promise<Routine> {
  return fetchWithAuth('/workout-routines', { method: 'POST', body: JSON.stringify(input) });
}

export function updateRoutine(id: string, input: RoutineInput): Promise<Routine> {
  return fetchWithAuth(`/workout-routines/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteRoutine(id: string): Promise<void> {
  await fetchWithAuth(`/workout-routines/${id}`, { method: 'DELETE' });
}

/** Saves the sets logged in a finished workout as a new routine. */
export function routineFromSession(sessionId: string, title?: string): Promise<Routine> {
  return fetchWithAuth(`/workout-routines/from-session/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? '' }),
  });
}
