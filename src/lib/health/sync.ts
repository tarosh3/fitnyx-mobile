import type { ActivitySummary } from '@/src/lib/api/activities';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { getHealthSync } from '@/src/lib/prefs';
import { healthBackend } from './backend';
import { roamToHealthWorkout, sessionToHealthWorkout } from './map';
import type { HealthToday } from './types';

/**
 * One-way export of FitNyx activity to the platform health store (Apple Health /
 * Health Connect). Every function is best-effort and silent: it does nothing
 * unless the user turned sync on AND granted write permission, and never throws
 * into the caller's success path.
 */
async function enabled(): Promise<boolean> {
  try {
    if (!(await getHealthSync())) return false;
    return await healthBackend.hasPermissions();
  } catch {
    return false;
  }
}

export async function syncRoamToHealth(activity: ActivitySummary): Promise<void> {
  try {
    if (!(await enabled())) return;
    const workout = roamToHealthWorkout(activity);
    if (workout) await healthBackend.saveWorkout(workout);
  } catch {
    /* best-effort */
  }
}

export async function syncWorkoutToHealth(
  session: Pick<WorkoutSession, 'started_at' | 'total_duration_sec' | 'kcal'>,
): Promise<void> {
  try {
    if (!(await enabled())) return;
    const workout = sessionToHealthWorkout(session);
    if (workout) await healthBackend.saveWorkout(workout);
  } catch {
    /* best-effort */
  }
}

export async function syncWeightToHealth(kg: number, when: Date = new Date()): Promise<void> {
  try {
    if (!(kg > 0)) return;
    if (!(await enabled())) return;
    await healthBackend.saveWeightKg(kg, when);
  } catch {
    /* best-effort */
  }
}

/** Today's steps + active energy from the health store; nulls when off/unavailable. */
export async function readHealthToday(): Promise<HealthToday> {
  const none: HealthToday = { steps: null, activeKcal: null };
  try {
    if (!(await enabled())) return none;
    const [steps, activeKcal] = await Promise.all([
      healthBackend.readTodaySteps().catch(() => null),
      healthBackend.readTodayActiveEnergyKcal().catch(() => null),
    ]);
    return { steps, activeKcal };
  } catch {
    return none;
  }
}
