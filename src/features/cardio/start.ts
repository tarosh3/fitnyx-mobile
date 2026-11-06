import type { Comfort } from '@/src/features/cardio/engine';
import type { Machine } from '@/src/features/cardio/machines';
import type { Program, ProgramLength } from '@/src/features/cardio/programs';
import { type RunState, saveComfort, saveRun } from '@/src/features/cardio/store';
import { isReady } from '@/src/features/workouts/start';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { offlineStartSession } from '@/src/lib/offline';

/** Seconds of 3-2-1 before the clock starts. */
const COUNTDOWN_SEC = 3;

interface BeginInput {
  userId: string;
  program: Program;
  machine: Machine;
  exerciseUuid: string;
  length: ProgramLength;
  comfort: Comfort;
  voice: boolean;
  activeSession: WorkoutSession | null;
  setActiveSession: (s: WorkoutSession | null) => void;
  resumeActiveSession: () => Promise<void>;
}

/**
 * Sets up a run. It joins the open workout if there is one (a warm-up, a finisher),
 * otherwise opens one now, so the workout's own clock covers the whole run.
 */
export async function beginRun(i: BeginInput): Promise<RunState> {
  let sessionId: string;
  let ownsSession = false;
  let wasReady = false;
  if (i.activeSession && ['in_progress', 'paused'].includes(i.activeSession.status)) {
    sessionId = i.activeSession.id;
    wasReady = isReady(i.activeSession);
    if (i.activeSession.status !== 'in_progress') await i.resumeActiveSession().catch(() => undefined);
  } else {
    try {
      const session = await offlineStartSession({});
      i.setActiveSession(session);
      sessionId = session.id;
      ownsSession = true;
    } catch (error: any) {
      const existing: WorkoutSession | undefined = error?.status === 409 ? error?.data?.session : undefined;
      if (!existing) throw error;
      i.setActiveSession(existing);
      sessionId = existing.id;
    }
  }
  const run: RunState = {
    programId: i.program.id, programTitle: i.program.title, machineId: i.machine.id, exerciseUuid: i.exerciseUuid, length: i.length,
    comfort: i.comfort, adjust: { primary: 0, secondary: 0 }, startedAtMs: Date.now() + COUNTDOWN_SEC * 1000, pausedTotalMs: 0, pausedAtMs: null,
    skippedSec: 0, distanceM: 0, countedSec: 0, sessionId, ownsSession, wasReady, voice: i.voice, finished: false,
  };
  await saveRun(i.userId, run);
  saveComfort(i.userId, i.machine.id, i.comfort).catch(() => undefined);
  return run;
}
