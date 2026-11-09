import { fetchWithAuth } from '@/src/lib/api';
import type { TodayKind } from '@/src/lib/api/todayWorkout';
import { localDateKey } from '@/src/lib/api/workoutSessions';

// Mirrors backend internal/service/program_service.go + program_checkin.go and
// internal/program (Phase, Change). Change both together.

export type PhaseKind = 'build' | 'deload' | 'test';
export interface ProgramPhase {
  kind: PhaseKind;
  /** One more set on each lift this week. */
  extra_set: boolean;
}

/** A lift that moved. `unit` "" = don't show the numbers (assisted). */
export interface ProgramChange {
  exercise_uuid: string;
  title: string;
  from: number;
  to: number;
  unit: 'kg' | 'reps' | 's' | '';
}

export interface ProgramSwap {
  from_uuid: string;
  from_title: string;
  to_uuid: string;
  to_title: string;
}

export interface ProgramCheckin {
  calendar_week: number;
  week: number;
  advanced: boolean;
  next_week: number;
  weeks: number;
  finished: boolean;
  planned: number;
  done: number;
  up: ProgramChange[];
  stalled: ProgramChange[];
  swaps: ProgramSwap[];
  next_phase: ProgramPhase;
  note: string;
  created_at: string;
}

export interface ProgramDay {
  id: string;
  title: string;
  day_index: number;
  exercises: number;
  done_this_week: boolean;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  weeks: number;
  /** Week of the block being trained (≤ weeks). */
  week: number;
  start_date: string;
  phase: ProgramPhase;
  planned: number;
  /** Program workouts finished this calendar week. */
  done: number;
  days: ProgramDay[];
  next_day_id: string;
  checkin_due: boolean;
  finished: boolean;
  last_checkin: ProgramCheckin | null;
  gains: ProgramChange[];
}

/** One exercise's targets for today's workout of the program. */
export interface ProgramTarget {
  day_exercise_id: string;
  title: string;
  tracking_type: string;
  exercise_uuid: string;
  part: string;
  sets: number;
  reps?: number;
  weight_kg?: number;
  assist_kg?: number;
  duration_sec?: number;
  distance_m?: number;
  rest_sec?: number;
  kind: TodayKind;
  note: string;
}

export interface DayTargets {
  day_id: string;
  week: number;
  phase: ProgramPhase;
  items: ProgramTarget[];
}

export const PROGRAM_LENGTHS = [4, 6, 8, 12] as const;

export interface CreateProgramInput {
  weeks: number;
  days_per_week?: number;
  session_min?: number;
}

/** POST /programs: builds a program and makes it the active plan. */
export function createProgram(input: CreateProgramInput): Promise<Program> {
  return fetchWithAuth('/programs', { method: 'POST', body: JSON.stringify({ ...input, today: localDateKey(new Date()) }) });
}

/** GET /programs/active: null when the active plan isn't an adaptive program. */
export async function getActiveProgram(): Promise<Program | null> {
  const res: { program: Program | null } = await fetchWithAuth(`/programs/active?date=${localDateKey(new Date())}`);
  return res.program ?? null;
}

/** GET /programs/active/days/:dayId/targets: today's targets for one day. */
export function getDayTargets(dayId: string): Promise<DayTargets> {
  return fetchWithAuth(`/programs/active/days/${encodeURIComponent(dayId)}/targets?date=${localDateKey(new Date())}`);
}

/** POST /programs/active/checkin: reviews finished weeks; null when none was due. */
export async function runCheckin(): Promise<ProgramCheckin | null> {
  const res: { checkin: ProgramCheckin | null } = await fetchWithAuth('/programs/active/checkin', {
    method: 'POST', body: JSON.stringify({ today: localDateKey(new Date()) }),
  });
  return res.checkin ?? null;
}
