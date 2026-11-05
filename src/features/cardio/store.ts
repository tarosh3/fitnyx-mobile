import type { Comfort, Adjust } from '@/src/features/cardio/engine';
import { type Machine, type MachineId, machineById } from '@/src/features/cardio/machines';
import type { ProgramLength } from '@/src/features/cardio/programs';
import type { ExerciseLog } from '@/src/lib/api/workoutSessions';
import { idbDelete, idbGetStale, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys } from '@/src/lib/cache/keys';

/** These are the user's own settings, not a cache: they never go stale. */
const KEEP_MS = 10 * 365 * 24 * 60 * 60 * 1000;

/**
 * A guided run in progress. The clock is worked out from timestamps, so it stays
 * right through a sleeping screen, a background stint or the app being killed.
 */
export interface RunState {
  programId: string;
  programTitle: string;
  machineId: MachineId;
  exerciseUuid: string;
  length: ProgramLength;
  comfort: Comfort;
  adjust: Adjust;
  /** May be a moment in the future: the 3-2-1 before the clock starts. */
  startedAtMs: number;
  pausedTotalMs: number;
  pausedAtMs: number | null;
  /** Seconds jumped over with Skip: they move the program on, not the time trained. */
  skippedSec: number;
  /** Metres banked up to `countedSec` on the program's timeline. */
  distanceM: number;
  countedSec: number;
  sessionId: string;
  /** This run opened the workout, so it may also finish or discard it. */
  ownsSession: boolean;
  /** Joined a workout whose clock hadn't started: dropping the run must not leave it running. */
  wasReady: boolean;
  voice: boolean;
  /** The program ended or the user chose to stop: the clock is frozen, showing the summary. */
  finished: boolean;
}

export const loadRun = (userId: string) => idbGetStale<RunState>(cacheKeys.cardioRun(userId));
export const saveRun = (userId: string, run: RunState) => idbSet(cacheKeys.cardioRun(userId), run, KEEP_MS);
export const clearRun = (userId: string) => idbDelete(cacheKeys.cardioRun(userId));

type ComfortStore = { last?: MachineId; byMachine: Partial<Record<MachineId, Comfort>> };

export async function loadComfort(userId: string): Promise<ComfortStore> {
  return (await idbGetStale<ComfortStore>(cacheKeys.cardioComfort(userId))) ?? { byMachine: {} };
}

export async function saveComfort(userId: string, machine: MachineId, comfort: Comfort): Promise<void> {
  const store = await loadComfort(userId);
  await idbSet(cacheKeys.cardioComfort(userId), { last: machine, byMachine: { ...store.byMachine, [machine]: comfort } }, KEEP_MS);
}

export function comfortFor(store: ComfortStore, machine: Machine): Comfort {
  return store.byMachine[machine.id] ?? { primary: machine.primary.start, secondary: machine.secondary?.start ?? 0, decline: false };
}

export const lastMachine = (store: ComfortStore): Machine => machineById(store.last ?? 'treadmill');

export interface RunRecord {
  programId: string;
  at: number;
  sec: number;
  distanceM: number;
}

const HISTORY_MAX = 100;

export async function loadHistory(userId: string): Promise<RunRecord[]> {
  return (await idbGetStale<RunRecord[]>(cacheKeys.cardioHistory(userId))) ?? [];
}

export async function addHistory(userId: string, record: RunRecord): Promise<RunRecord[]> {
  const next = [record, ...(await loadHistory(userId))].slice(0, HISTORY_MAX);
  await idbSet(cacheKeys.cardioHistory(userId), next, KEEP_MS);
  return next;
}

export const timesDone = (history: RunRecord[], programId: string) => history.filter((r) => r.programId === programId).length;

/** The longest run before this one on the same program, to beat. */
export function bestBefore(history: RunRecord[], programId: string): RunRecord | null {
  return history.filter((r) => r.programId === programId).sort((a, b) => b.distanceM - a.distanceM)[0] ?? null;
}

// The logger is still mounted under the run; it picks up the logged set when it regains focus.
let finishedLog: ExerciseLog | null = null;
export const setFinishedLog = (log: ExerciseLog) => { finishedLog = log; };
export function takeFinishedLog(): ExerciseLog | null {
  const log = finishedLog;
  finishedLog = null;
  return log;
}
