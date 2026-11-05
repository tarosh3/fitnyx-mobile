import { distanceOver, type Timeline } from '@/src/features/cardio/engine';
import type { Machine } from '@/src/features/cardio/machines';
import type { RunState } from '@/src/features/cardio/store';

/** Seconds actually trained: paused time and the 3-2-1 don't count. */
export function activeSecOf(run: Pick<RunState, 'startedAtMs' | 'pausedTotalMs' | 'pausedAtMs'>, nowMs: number): number {
  const until = run.pausedAtMs ?? nowMs;
  return Math.max(0, (until - run.startedAtMs - run.pausedTotalMs) / 1000);
}

/** Where the run is on the program's timeline. */
export const timelineSecOf = (run: RunState, nowMs: number) => activeSecOf(run, nowMs) + run.skippedSec;

/** Metres so far, including what hasn't been banked yet. */
export function distanceOf(run: RunState, t: Timeline, machine: Machine, nowMs: number): number {
  return run.distanceM + distanceOver(t, machine, run.comfort, run.adjust, run.countedSec, timelineSecOf(run, nowMs));
}

/** Banks the distance so far: call it before anything that changes speed or jumps ahead. */
export function banked(run: RunState, t: Timeline, machine: Machine, nowMs: number): RunState {
  return { ...run, distanceM: distanceOf(run, t, machine, nowMs), countedSec: Math.min(t.totalSec, timelineSecOf(run, nowMs)) };
}

export function paused(run: RunState, t: Timeline, machine: Machine, nowMs: number): RunState {
  return run.pausedAtMs != null ? run : { ...banked(run, t, machine, nowMs), pausedAtMs: nowMs };
}

export function resumed(run: RunState, nowMs: number): RunState {
  return run.pausedAtMs == null ? run : { ...run, pausedTotalMs: run.pausedTotalMs + (nowMs - run.pausedAtMs), pausedAtMs: null };
}

/** Jumps to the next phase; the time trained so far stays as it is. */
export function skipped(run: RunState, t: Timeline, machine: Machine, nowMs: number): RunState {
  const at = timelineSecOf(run, nowMs);
  const phase = t.phases.find((p) => at < p.endSec);
  if (!phase) return run;
  const next = banked(run, t, machine, nowMs);
  return { ...next, skippedSec: run.skippedSec + (phase.endSec - at), countedSec: phase.endSec };
}
