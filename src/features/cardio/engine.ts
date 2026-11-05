import type { Machine } from '@/src/features/cardio/machines';
import { type Phase, type Program, type ProgramLength, phasesOf } from '@/src/features/cardio/programs';

/** What the user finds comfortable on this machine; a program is relative to it. */
export interface Comfort {
  primary: number;
  secondary: number;
  /** The treadmill can go below 0% incline. */
  decline: boolean;
}

/** Live changes ("too hard, too easy") that carry on for the rest of the run. */
export interface Adjust {
  primary: number;
  secondary: number;
}

export interface Targets {
  primary: number;
  secondary: number | null;
}

export interface TimelinePhase extends Phase {
  index: number;
  startSec: number;
  endSec: number;
  base: Targets;
}

export interface Timeline {
  phases: TimelinePhase[];
  totalSec: number;
}

const snap = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Avoids 7.000000000001 from float maths. */
const tidy = (v: number) => Math.round(v * 100) / 100;

function fit(machine: Machine, which: 'primary' | 'secondary', comfort: Comfort, value: number): number {
  const dial = which === 'primary' ? machine.primary : machine.secondary!;
  const floor = which === 'secondary' && machine.id === 'treadmill' && !comfort.decline ? 0 : dial.min;
  return tidy(clamp(snap(value, dial.step), floor, dial.max));
}

export function buildTimeline(program: Program, length: ProgramLength, machine: Machine, comfort: Comfort): Timeline {
  let at = 0;
  const phases = phasesOf(program, length).map((p, index) => {
    const startSec = at;
    at += p.sec;
    const climb = p.climb ?? 0;
    return {
      ...p, index, startSec, endSec: at,
      base: {
        primary: fit(machine, 'primary', comfort, machine.primaryAt(comfort.primary, p.pace, climb)),
        secondary: machine.secondary ? fit(machine, 'secondary', comfort, machine.secondaryAt(comfort.secondary, p.pace, climb)) : null,
      },
    };
  });
  return { phases, totalSec: at };
}

/** The numbers to set on the console for a phase, after the user's live changes. */
export function targetsFor(phase: TimelinePhase, machine: Machine, comfort: Comfort, adjust: Adjust): Targets {
  return {
    primary: fit(machine, 'primary', comfort, phase.base.primary + adjust.primary),
    secondary: phase.base.secondary == null ? null : fit(machine, 'secondary', comfort, phase.base.secondary + adjust.secondary),
  };
}

export interface Position {
  phase: TimelinePhase;
  next: TimelinePhase | null;
  /** Seconds left in this phase. */
  leftSec: number;
  /** Seconds left in the whole program. */
  totalLeftSec: number;
  /** 0–1 through the whole program. */
  progress: number;
  done: boolean;
}

export function positionAt(t: Timeline, sec: number): Position {
  const at = Math.max(0, sec);
  const last = t.phases[t.phases.length - 1];
  const phase = t.phases.find((p) => at < p.endSec) ?? last;
  return {
    phase,
    next: t.phases[phase.index + 1] ?? null,
    leftSec: Math.max(0, phase.endSec - at),
    totalLeftSec: Math.max(0, t.totalSec - at),
    progress: t.totalSec ? Math.min(1, at / t.totalSec) : 1,
    done: at >= t.totalSec,
  };
}

/** Metres covered between two points on the timeline. Only treadmills know their speed. */
export function distanceOver(t: Timeline, machine: Machine, comfort: Comfort, adjust: Adjust, fromSec: number, toSec: number): number {
  if (!machine.estimatesDistance || toSec <= fromSec) return 0;
  let metres = 0;
  for (const p of t.phases) {
    const a = Math.max(fromSec, p.startSec);
    const b = Math.min(toSec, p.endSec);
    if (b > a) metres += (targetsFor(p, machine, comfort, adjust).primary * 1000 / 3600) * (b - a);
  }
  return metres;
}

export interface DialChange {
  dial: 'primary' | 'secondary';
  dir: 'up' | 'down';
  to: number;
}

export function changesBetween(a: Targets, b: Targets): DialChange[] {
  const out: DialChange[] = [];
  if (b.primary !== a.primary) out.push({ dial: 'primary', dir: b.primary > a.primary ? 'up' : 'down', to: b.primary });
  if (a.secondary != null && b.secondary != null && b.secondary !== a.secondary) {
    out.push({ dial: 'secondary', dir: b.secondary > a.secondary ? 'up' : 'down', to: b.secondary });
  }
  return out;
}

const unitText = (unit: string, to: number) => (unit === 'level' ? `level ${to}` : unit === '%' ? `${to}%` : `${to} ${unit}`);

/** "Speed up to 10 km/h · Raise the incline to 3%", or "Hold this pace" when nothing changes. */
export function changeText(machine: Machine, changes: DialChange[]): string {
  if (!changes.length) return 'Hold this pace';
  return changes.map((c) => {
    const dial = c.dial === 'primary' ? machine.primary : machine.secondary!;
    return `${c.dir === 'up' ? dial.up : dial.down} to ${unitText(dial.unit, c.to)}`;
  }).join(' · ');
}

/** The same for speaking: units in words, a comma where the screen has a dot. */
export function spokenChange(machine: Machine, changes: DialChange[]): string {
  return changeText(machine, changes).replace(/ · /g, ', ').replace(/km\/h/g, 'kilometres an hour').replace(/%/g, ' percent').replace(/\brpm\b/g, 'R P M').replace(/\bspm\b/g, 'strokes a minute');
}

/** How long before a change it gets called out: short phases get less warning. */
export const warnBefore = (phase: Pick<Phase, 'sec'>) => (phase.sec <= 45 ? 5 : 10);

/** Effort band, for colour: 0 easy → 4 flat out. */
export function zoneOf(p: Pick<Phase, 'pace' | 'climb'>): 0 | 1 | 2 | 3 | 4 {
  const effort = p.pace + (p.climb ?? 0) * 0.035;
  if (effort < 0.7) return 0;
  if (effort < 0.9) return 1;
  if (effort < 1.05) return 2;
  if (effort < 1.25) return 3;
  return 4;
}

export const ZONE_LABELS = ['Easy', 'Steady', 'Comfortably hard', 'Hard', 'All out'] as const;

/** What to start from next time: today's comfort plus what the user settled on. */
export function learnedComfort(machine: Machine, comfort: Comfort, adjust: Adjust): Comfort {
  return {
    ...comfort,
    primary: tidy(clamp(snap(comfort.primary + adjust.primary, machine.primary.step), machine.primary.min, machine.primary.max)),
    secondary: machine.secondary ? tidy(clamp(snap(comfort.secondary + adjust.secondary, machine.secondary.step), machine.secondary.min, machine.secondary.max)) : comfort.secondary,
  };
}
