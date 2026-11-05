import { activeSecOf, distanceOf } from '@/src/features/cardio/clock';
import { buildTimeline, learnedComfort } from '@/src/features/cardio/engine';
import { machineById } from '@/src/features/cardio/machines';
import { programById } from '@/src/features/cardio/programs';
import { addHistory, clearRun, type RunState, saveComfort } from '@/src/features/cardio/store';
import { nextSetNumber } from '@/src/features/workouts/logger/rows';
import type { ExerciseLog } from '@/src/lib/api/workoutSessions';
import { offlineGetSession, offlineLogSet } from '@/src/lib/offline/offlineApi';

/** Below this a run isn't worth a set in the log. */
export const MIN_SAVE_SEC = 30;

/** What a run has done so far, from its saved state alone. */
export function runResult(run: RunState, nowMs: number): { activeSec: number; distanceM: number } {
  const program = programById(run.programId);
  const machine = machineById(run.machineId);
  const activeSec = activeSecOf(run, nowMs);
  if (!program) return { activeSec, distanceM: run.distanceM };
  return { activeSec, distanceM: distanceOf(run, buildTimeline(program, run.length, machine, run.comfort), machine, nowMs) };
}

/** Logs a run as one cardio set, remembers its settings, then closes it. */
export async function logRun(userId: string, run: RunState, nowMs = Date.now()): Promise<ExerciseLog> {
  const { activeSec, distanceM } = runResult(run, nowMs);
  const machine = machineById(run.machineId);
  const res = await offlineGetSession(run.sessionId);
  const done = (res.exercise_logs ?? []).filter((l) => l.exercise_uuid === run.exerciseUuid);
  const log = await offlineLogSet(run.sessionId, {
    exercise_uuid: run.exerciseUuid, set_number: nextSetNumber(done), actual_reps: 0,
    actual_duration_sec: Math.round(activeSec), actual_distance_m: distanceM > 0 ? Math.round(distanceM) : undefined,
  });
  await saveComfort(userId, machine.id, learnedComfort(machine, run.comfort, run.adjust)).catch(() => undefined);
  await addHistory(userId, { programId: run.programId, at: nowMs, sec: Math.round(activeSec), distanceM: Math.round(distanceM) }).catch(() => undefined);
  await clearRun(userId).catch(() => undefined);
  return log;
}

/**
 * The workout a run belongs to has ended elsewhere (a notification, another screen).
 * Offline or while the workout is still loading, "no workout" proves nothing.
 */
export const runIsOrphaned = (run: RunState | null, ctx: { hasOpenWorkout: boolean; workoutLoading: boolean; offline: boolean }) =>
  !!run && !ctx.hasOpenWorkout && !ctx.workoutLoading && !ctx.offline;
