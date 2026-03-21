import { fetchWithAuth } from '@/src/lib/api';

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id?: string;
  day_id?: string;
  workout_date: string;
  started_at: string;
  finished_at?: string;
  status: 'in_progress' | 'paused' | 'completed' | 'abandoned';
  total_duration_sec: number;
  paused_at?: string;
  last_resumed_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  user_id: string;
  exercise_uuid: string;
  set_index: number;
  reps: number;
  weight_kg?: number;
  duration_sec?: number;
  is_warmup: boolean;
  rpe?: number;
  created_at: string;
}

export interface SessionWithLogs {
  session: WorkoutSession;
  exercise_logs: ExerciseLog[];
}

export interface StartSessionInput {
  workout_plan_id: string;
  workout_day_id: string;
  started_at?: string; // ISO8601 — used by offline sync to preserve original start time
}

export interface LogExerciseInput {
  exercise_uuid: string;
  set_number: number;
  actual_reps: number;
  actual_weight_kg?: number;
  actual_rest_seconds?: number;
}

export async function logExerciseSet(sessionId: string, data: LogExerciseInput): Promise<ExerciseLog> {
  return fetchWithAuth(`/workout-sessions/${sessionId}/exercises`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWorkoutSessions(
  page: number = 1,
  limit: number = 20
): Promise<{ data: WorkoutSession[]; meta: { total: number; page: number; per_page: number } }> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  return fetchWithAuth(`/workout-sessions?${params.toString()}`);
}

export async function getWorkoutSession(sessionId: string): Promise<SessionWithLogs> {
  return fetchWithAuth(`/workout-sessions/${sessionId}`);
}

export async function updateExerciseLog(logId: string, data: Partial<LogExerciseInput>): Promise<ExerciseLog> {
  return fetchWithAuth(`/workout-sessions/logs/${logId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExerciseLog(logId: string): Promise<void> {
  return fetchWithAuth(`/workout-sessions/logs/${logId}`, {
    method: 'DELETE',
  });
}

export type SessionAction = 'start' | 'pause' | 'resume' | 'finish' | 'abandon';

export interface ActiveSessionResponse {
  active: boolean;
  session: WorkoutSession | null;
  exercise_logs?: ExerciseLog[];
}

/** Enriched exercise summary returned by the history endpoint. */
export interface HistoryExerciseSummary {
  exercise_uuid: string;
  exercise_name: string;
  sets: number;
  total_reps: number;
  max_weight_kg: number | null;
}

/** Enriched session object returned by GET /workout-sessions/history. */
export interface HistorySession {
  id: string;
  plan_name: string;
  workout_date: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_duration_sec: number;
  exercise_count: number;
  total_sets: number;
  total_volume_kg: number;
  exercises: HistoryExerciseSummary[];
}

export interface SessionHistoryResponse {
  data: HistorySession[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export async function sessionAction(
  action: SessionAction,
  options?: { planId?: string; dayId?: string; sessionId?: string; timestamp?: string; startedAt?: string }
): Promise<WorkoutSession> {
  return fetchWithAuth('/workout-sessions/action', {
    method: 'POST',
    body: JSON.stringify({
      action,
      plan_id: options?.planId,
      day_id: options?.dayId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp,
      started_at: options?.startedAt,
    }),
  });
}

export async function getActiveSession(): Promise<ActiveSessionResponse> {
  return fetchWithAuth('/workout-sessions/active');
}

export async function getSessionsHistory(page: number = 1, limit: number = 20): Promise<SessionHistoryResponse> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  return fetchWithAuth(`/workout-sessions/history?${params.toString()}`);
}

export async function startWorkout(planId: string, dayId: string): Promise<WorkoutSession> {
  return sessionAction('start', { planId, dayId });
}

export async function pauseSession(sessionId: string): Promise<WorkoutSession> {
  return sessionAction('pause', { sessionId });
}

export async function resumeSession(sessionId: string): Promise<WorkoutSession> {
  return sessionAction('resume', { sessionId });
}

export async function finishSession(sessionId: string): Promise<WorkoutSession> {
  return sessionAction('finish', { sessionId });
}

export async function abandonSessionAction(sessionId: string): Promise<WorkoutSession> {
  return sessionAction('abandon', { sessionId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return fetchWithAuth(`/workout-sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
