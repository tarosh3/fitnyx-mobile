import type { Router } from 'expo-router';

import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { offlinePauseSession, offlineStartSession } from '@/src/lib/offline';

export interface StartTarget {
  /** Routine or program plan id; omit both for an empty workout. */
  planId?: string;
  dayId?: string;
}

/**
 * A workout that exists but whose clock hasn't started: the user is still
 * checking exercises. It's a session paused straight after starting, so the
 * running time stays 0 until they tap Start or tick their first set.
 */
export function isReady(s: Pick<WorkoutSession, 'status' | 'total_duration_sec'> | null | undefined): boolean {
  return !!s && s.status === 'paused' && (s.total_duration_sec ?? 0) === 0;
}

type StartDeps = { router: Router; setActiveSession: (s: WorkoutSession | null) => void };
/** Exercise to add as soon as the logger opens (Quick start → Cardio). */
type StartOpts = { addExerciseUuid?: string };

let starting: Promise<void> | null = null;

/**
 * Creates the session in the "ready" state and opens the logger. If another
 * workout is already open, opens that one instead (the server allows one).
 * A call made while a start is still running joins it: a double tap on a
 * start button created two sessions (offline: two queued ones) and opened two
 * loggers.
 */
export function startWorkout(target: StartTarget, deps: StartDeps, opts: StartOpts = {}): Promise<void> {
  starting ??= start(target, deps, opts).finally(() => { starting = null; });
  return starting;
}

async function start(target: StartTarget, deps: StartDeps, opts: StartOpts): Promise<void> {
  const open = (id: string) =>
    deps.router.push(opts.addExerciseUuid ? `/workouts/session/${id}?add=${opts.addExerciseUuid}` : `/workouts/session/${id}`);
  let session: WorkoutSession;
  try {
    session = await offlineStartSession({ workout_plan_id: target.planId, workout_day_id: target.dayId });
  } catch (error: any) {
    const existing: WorkoutSession | undefined = error?.status === 409 ? error?.data?.session : undefined;
    if (existing) {
      deps.setActiveSession(existing);
      open(existing.id);
      return;
    }
    throw error;
  }
  try {
    session = await offlinePauseSession(session.id);
  } catch {
    // Still usable running; the user can pause from the header.
  }
  deps.setActiveSession(session);
  open(session.id);
}
