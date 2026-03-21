import { fetchWithAuth } from '@/src/lib/api';

export interface DashboardExerciseSummary {
  exercise_uuid: string;
  exercise_name: string;
  sets: number;
  total_reps: number;
  max_weight_kg: number | null;
}

export interface DashboardSession {
  id: string;
  plan_id: string | null;
  day_id: string | null;
  plan_name: string;
  workout_date: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  total_duration_sec: number;
  exercise_count: number;
  total_sets: number;
  total_volume_kg: number;
  exercises: DashboardExerciseSummary[];
}

export interface DashboardPlanDay {
  id: string;
  day_index: number;
  day_name: string;
  exercise_count: number;
}

export interface DashboardPlan {
  id: string;
  title: string;
}

export interface DashboardResponse {
  sessions: DashboardSession[];
  total_sessions: number;
  active_plan: DashboardPlan | null;
  current_day: DashboardPlanDay | null;
  current_day_index: number;
  total_days: number;
  daily_insight: string;
}

export async function getDashboard(): Promise<DashboardResponse> {
  return fetchWithAuth('/dashboard');
}
