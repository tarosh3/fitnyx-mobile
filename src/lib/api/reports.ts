import { fetchWithAuth } from '@/src/lib/api';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import type { TrackingType } from '@/src/types/exercise';

// --- Raw report data (GET /reports/data) — mirrors the backend's internal/report ---

export interface ReportSet {
  exercise_uuid: string;
  set_index: number;
  reps: number;
  weight_kg: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  rest_sec: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_pr: boolean;
}

export interface ReportSession {
  id: string;
  name: string;
  /** Local workout date, YYYY-MM-DD. */
  date: string;
  started_at: string;
  duration_sec: number;
  sets: ReportSet[];
}

export interface ReportExercise {
  title: string;
  tracking_type: TrackingType;
  primary_muscles: string[];
}

export interface ReportRoam {
  date: string;
  type: 'run' | 'walk' | 'cycle';
  name: string | null;
  distance_m: number;
  moving_time_sec: number;
  elapsed_time_sec: number;
  avg_pace_sec_per_km: number | null;
  elevation_gain_m: number | null;
  steps: number | null;
}

export interface ReportProfile {
  first_name?: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  experience?: string;
  target_weight_kg?: number;
  injuries?: string[];
}

export interface ReportData {
  from: string;
  to: string;
  profile: ReportProfile;
  sessions: ReportSession[];
  exercises: Record<string, ReportExercise>;
  roams: ReportRoam[];
}

/** Completed workouts (every set), Roams and the profile for from..to (local dates, at most a year). */
export async function fetchReportData(from: string, to: string): Promise<ReportData> {
  const q = new URLSearchParams({ from, to, date: localDateKey(new Date()) });
  return fetchWithAuth(`/reports/data?${q.toString()}`);
}

// --- AI training report (GET / POST /reports/ai) ---

export interface AiReport {
  id: string;
  status: 'generating' | 'ready' | 'failed';
  period_from: string;
  period_to: string;
  /** Markdown, set when ready. */
  content: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AiReportStatus {
  /** 10 training days (distinct days with a workout or Roam) unlock it. */
  unlocked: boolean;
  training_days: number;
  required_days: number;
  /** The latest ready report, if any. */
  report: AiReport | null;
  generating: boolean;
  /** When a new report can be written; null = now. One per week. */
  next_available_at: string | null;
}

export async function fetchAiReport(): Promise<AiReportStatus> {
  return fetchWithAuth('/reports/ai');
}

/**
 * Returns this week's report, or starts writing a new one (`generating`; poll
 * fetchAiReport). Throws 403 `code: 'locked'` before 10 training days and 503
 * `code: 'cooldown'` right after a failed attempt.
 */
export async function requestAiReport(): Promise<AiReportStatus> {
  return fetchWithAuth(`/reports/ai?date=${localDateKey(new Date())}`, { method: 'POST' });
}
