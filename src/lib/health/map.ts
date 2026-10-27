import type { ActivityType } from '@/src/features/roam/geo';
import type { ActivitySummary } from '@/src/lib/api/activities';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import type { HealthWorkout, HealthWorkoutKind } from './types';

/** Roam activity type → neutral workout kind. Pure. */
export function roamKind(type: ActivityType): HealthWorkoutKind {
  switch (type) {
    case 'run':
      return 'running';
    case 'walk':
    case 'stride': // resolved to run/walk server-side; walking is the safe default
      return 'walking';
    case 'cycle':
      return 'cycling';
    default:
      return 'other';
  }
}

/** A saved Roam → a health workout. Null when the timestamps are unusable. */
export function roamToHealthWorkout(a: ActivitySummary): HealthWorkout | null {
  const start = new Date(a.started_at);
  const end = new Date(a.ended_at);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
  return {
    kind: roamKind(a.activity_type),
    start,
    end,
    distanceM: a.distance_m > 0 ? a.distance_m : undefined,
    energyKcal: a.kcal != null && a.kcal > 0 ? a.kcal : undefined,
  };
}

/** A finished gym workout session → a strength-training health workout. */
export function sessionToHealthWorkout(s: Pick<WorkoutSession, 'started_at' | 'total_duration_sec' | 'kcal'>): HealthWorkout | null {
  const start = new Date(s.started_at);
  if (isNaN(start.getTime()) || !s.total_duration_sec || s.total_duration_sec <= 0) return null;
  const end = new Date(start.getTime() + s.total_duration_sec * 1000);
  return {
    kind: 'strength',
    start,
    end,
    energyKcal: s.kcal != null && s.kcal > 0 ? s.kcal : undefined,
  };
}
