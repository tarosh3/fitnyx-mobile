import { fetchWithAuth } from '@/src/lib/api';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import type { Exercise } from '@/src/types/exercise';

/** What a target changed versus last time (backend internal/todayplan). */
export type TodayKind = 'first' | 'up' | 'reps' | 'hold' | 'return' | 'light';

/** One exercise of today's workout with its targets. */
export interface TodayItem {
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
  exercise: Exercise;
}

export interface TodayWorkout {
  parts: string[];
  title: string;
  reason: string;
  tip?: string;
  minutes: number;
  light: boolean;
  /** Who wrote the reason. The numbers always come from the rules. */
  source: 'ai' | 'rules';
  items: TodayItem[];
}

/** GET /today-workout: what to train today. `skip` = parts not wanted today. */
export async function getTodayWorkout(skip: string[] = []): Promise<TodayWorkout> {
  const params = new URLSearchParams({ date: localDateKey(new Date()) });
  if (skip.length) params.set('skip', skip.join(','));
  return fetchWithAuth(`/today-workout?${params.toString()}`);
}

/** What to do instead of an exercise whose machine is taken, best first. */
export async function getTodayAlternatives(exerciseUuid: string, exclude: string[] = []): Promise<TodayItem[]> {
  const params = new URLSearchParams({ exercise: exerciseUuid, date: localDateKey(new Date()) });
  if (exclude.length) params.set('exclude', exclude.join(','));
  const res: { data?: TodayItem[] } = await fetchWithAuth(`/today-workout/alternatives?${params.toString()}`);
  return res.data ?? [];
}
