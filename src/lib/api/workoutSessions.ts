import type { TrackingType } from '@/src/types/exercise';
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
  /** Estimated calories burned, set when the workout finishes; null without a body weight. */
  kcal?: number | null;
  /** Grit earned (backend internal/grit, rescored with its week); null = not scored yet. */
  grit?: number | null;
  grit_breakdown?: GritBreakdown | null;
  created_at: string;
}

/** What a workout's Grit was made of (backend grit.Breakdown). */
export interface GritBreakdown {
  sets: number;
  hard_sets: number;
  prs: number;
  routine: boolean;
  streak: boolean;
  /** Under 10 minutes: nothing counted. */
  too_short: boolean;
  /** The 400-a-day cap took some points. */
  capped: boolean;
  grit: number;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  user_id: string;
  exercise_uuid: string;
  set_index: number;
  reps: number;
  weight_kg?: number;
  /** Length of a timed hold or cardio set. (Before 2026-10 this held rest time.) */
  duration_sec?: number;
  rest_sec?: number;
  distance_m?: number;
  is_warmup: boolean;
  rpe?: number;
  created_at: string;
  is_pr?: boolean; // set by the log endpoint when this set beats the all-time best weight
}

export interface SessionWithLogs {
  session: WorkoutSession;
  exercise_logs: ExerciseLog[];
}

export interface StartSessionInput {
  /** Omitted for an empty workout (no routine or program). */
  workout_plan_id?: string;
  workout_day_id?: string;
  started_at?: string; // ISO8601 — used by offline sync to preserve original start time
}

export interface LogExerciseInput {
  exercise_uuid: string;
  set_number: number;
  actual_reps: number;
  actual_weight_kg?: number;
  actual_rest_seconds?: number;
  /** Timed hold / cardio set length. */
  actual_duration_sec?: number;
  /** Cardio distance in metres. */
  actual_distance_m?: number;
  rpe?: number;
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
  tracking_type?: TrackingType;
  total_duration_sec?: number;
  total_distance_m?: number;
}

/** Enriched session object returned by GET /workout-sessions/history. */
export interface HistorySession {
  id: string;
  plan_id?: string | null;
  day_id?: string | null;
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

/** Device-local calendar date (YYYY-MM-DD) — toISOString() would give the UTC date. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
      // Local date of the start (offline replays use the original start time),
      // so a 5 AM IST workout isn't filed under yesterday's UTC date.
      workout_date:
        action === 'start'
          ? localDateKey(options?.startedAt ? new Date(options.startedAt) : new Date())
          : undefined,
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
