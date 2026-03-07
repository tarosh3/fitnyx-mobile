import { fetchWithAuth } from '@/src/lib/api';

export interface WorkoutPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  goal?: string;
  timezone: string;
  source: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlanDay {
  id: string;
  plan_id: string;
  day_index: number;
  title?: string;
  notes?: string;
  estimated_duration_min?: number;
  is_rest_day: boolean;
  created_at: string;
}

export interface Exercise {
  uuid: string;
  title: string;
  category?: string;
  equipment?: string;
  muscles?: string[];
  difficulty_level?: string;
  media_url?: string;
  video_url?: string;
  instructions?: string;
}

export interface WorkoutDayExercise {
  id: string;
  day_id: string;
  exercise_uuid: string;
  exercise_order: number;
  target_sets?: number;
  target_reps?: number;
  target_weight_kg?: number;
  rest_seconds?: number;
  tempo?: string;
  rir?: number;
  created_at: string;
  exercise?: Exercise;
}

export interface CreatePlanInput {
  title: string;
  description?: string;
  goal?: string;
}

export interface CreateDayInput {
  title?: string;
  notes?: string;
  estimated_duration_min?: number;
  is_rest_day: boolean;
}

export interface CreateExerciseInput {
  exercise_uuid: string;
  target_sets?: number;
  target_reps?: number;
  target_weight_kg?: number;
  rest_seconds?: number;
  tempo?: string;
  rir?: number;
}

export async function createWorkoutPlan(data: CreatePlanInput): Promise<WorkoutPlan> {
  return fetchWithAuth('/workout-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWorkoutPlans(): Promise<{ data: WorkoutPlan[] }> {
  return fetchWithAuth('/workout-plans');
}

export async function getDefaultWorkoutPlans(): Promise<{ data: WorkoutPlan[] }> {
  return fetchWithAuth('/workout-plans/defaults');
}

export async function getWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  return fetchWithAuth(`/workout-plans/${planId}`);
}

export async function updateWorkoutPlan(planId: string, data: Partial<CreatePlanInput>): Promise<WorkoutPlan> {
  return fetchWithAuth(`/workout-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWorkoutPlan(planId: string): Promise<{ message: string }> {
  return fetchWithAuth(`/workout-plans/${planId}`, {
    method: 'DELETE',
  });
}

export async function activateWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  return fetchWithAuth(`/workout-plans/${planId}/activate`, {
    method: 'PUT',
  });
}

export async function addDaysToPlan(planId: string, days: CreateDayInput[]): Promise<{ data: WorkoutPlanDay[] }> {
  return fetchWithAuth(`/workout-plans/${planId}/days`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

export async function getPlanDays(planId: string): Promise<{ data: WorkoutPlanDay[] }> {
  return fetchWithAuth(`/workout-plans/${planId}/days`);
}

export async function updateDay(planId: string, dayId: string, data: Partial<CreateDayInput>): Promise<WorkoutPlanDay> {
  return fetchWithAuth(`/workout-plans/${planId}/days/${dayId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDay(planId: string, dayId: string): Promise<{ message: string }> {
  return fetchWithAuth(`/workout-plans/${planId}/days/${dayId}`, {
    method: 'DELETE',
  });
}

export async function addExercisesToDay(dayId: string, exercises: CreateExerciseInput[]): Promise<{ data: WorkoutDayExercise[] }> {
  return fetchWithAuth(`/workout-plans/days/${dayId}/exercises`, {
    method: 'POST',
    body: JSON.stringify({ exercises }),
  });
}

export async function getDayExercises(dayId: string): Promise<{ data: WorkoutDayExercise[] }> {
  return fetchWithAuth(`/workout-plans/days/${dayId}/exercises`);
}

export async function updateExercise(
  exerciseId: string,
  data: Partial<Omit<CreateExerciseInput, 'exercise_uuid'>>
): Promise<WorkoutDayExercise> {
  return fetchWithAuth(`/workout-plans/days/exercises/${exerciseId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExercise(exerciseId: string): Promise<{ message: string }> {
  return fetchWithAuth(`/workout-plans/days/exercises/${exerciseId}`, {
    method: 'DELETE',
  });
}

export async function reorderExercises(dayId: string, exerciseIds: string[]): Promise<{ data: WorkoutDayExercise[] }> {
  return fetchWithAuth(`/workout-plans/days/${dayId}/exercises/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ exercise_ids: exerciseIds }),
  });
}

export async function searchExercises(
  search?: string,
  muscle?: string,
  page: number = 1,
  limit: number = 30
): Promise<{ data: Exercise[]; meta: any }> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (muscle) params.append('muscle', muscle);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  return fetchWithAuth(`/view/exercises?${params.toString()}`);
}
