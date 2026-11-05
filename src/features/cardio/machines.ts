import type { Exercise } from '@/src/types/exercise';

export type MachineId = 'treadmill' | 'bike' | 'elliptical' | 'rower' | 'stairs';

/** One thing the user sets on the machine's console. */
export interface Dial {
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  /** A sensible first value, until the user has told us what's comfortable. */
  start: number;
  /** "Speed up", "Slow down": the words a cue uses. */
  up: string;
  down: string;
}

export interface Machine {
  id: MachineId;
  label: string;
  /** Catalog exercise a run is logged against, unless started from a specific one. */
  exerciseUuid: string;
  primary: Dial;
  secondary: Dial | null;
  /** Speed is known, so distance can be worked out as you go. Others read it off the console. */
  estimatesDistance: boolean;
  /** Maps a phase's effort to the console's numbers (see `dialTargets` in engine.ts). */
  primaryAt: (comfort: number, pace: number, climb: number) => number;
  secondaryAt: (comfort: number, pace: number, climb: number) => number;
}

/** A level console: one effort step (pace +0.125) is about one level. */
const levelFrom = (comfort: number, pace: number, climb: number) => comfort + (pace - 1) * 8 + climb / 2;

export const MACHINES: Machine[] = [
  {
    id: 'treadmill', label: 'Treadmill', exerciseUuid: '6f1c0a52-3b7e-4d1a-9c2e-1a7b9e0c4d01', estimatesDistance: true,
    primary: { label: 'Speed', unit: 'km/h', step: 0.5, min: 1, max: 22, start: 7, up: 'Speed up', down: 'Slow down' },
    secondary: { label: 'Incline', unit: '%', step: 0.5, min: -3, max: 15, start: 1, up: 'Raise the incline', down: 'Lower the incline' },
    primaryAt: (comfort, pace) => comfort * pace,
    secondaryAt: (comfort, _pace, climb) => comfort + climb,
  },
  {
    id: 'bike', label: 'Bike', exerciseUuid: 'e114e1e6-107f-464a-9ef9-999e81b493a8', estimatesDistance: false,
    primary: { label: 'Resistance', unit: 'level', step: 1, min: 1, max: 24, start: 6, up: 'Add resistance', down: 'Ease the resistance' },
    secondary: { label: 'Cadence', unit: 'rpm', step: 5, min: 40, max: 130, start: 80, up: 'Pedal faster', down: 'Pedal slower' },
    primaryAt: (comfort, pace, climb) => levelFrom(comfort, Math.min(pace, 1.15), climb),
    secondaryAt: (comfort, pace) => comfort * (1 + (pace - 1) * 0.4),
  },
  {
    id: 'elliptical', label: 'Elliptical', exerciseUuid: 'fb526a82-43ba-428c-874e-2338aa1e2325', estimatesDistance: false,
    primary: { label: 'Resistance', unit: 'level', step: 1, min: 1, max: 24, start: 6, up: 'Add resistance', down: 'Ease the resistance' },
    secondary: { label: 'Ramp', unit: 'level', step: 1, min: 0, max: 20, start: 2, up: 'Raise the ramp', down: 'Lower the ramp' },
    primaryAt: (comfort, pace) => levelFrom(comfort, pace, 0),
    secondaryAt: (comfort, _pace, climb) => comfort + climb,
  },
  {
    id: 'rower', label: 'Rower', exerciseUuid: '6f1c0a52-3b7e-4d1a-9c2e-1a7b9e0c4d04', estimatesDistance: false,
    primary: { label: 'Stroke rate', unit: 'spm', step: 1, min: 14, max: 42, start: 22, up: 'Row faster', down: 'Row slower' },
    secondary: { label: 'Damper', unit: 'level', step: 1, min: 1, max: 10, start: 5, up: 'Raise the damper', down: 'Lower the damper' },
    primaryAt: (comfort, pace) => comfort * (1 + (pace - 1) * 0.5),
    secondaryAt: (comfort, _pace, climb) => comfort + climb / 3,
  },
  {
    id: 'stairs', label: 'Stairs', exerciseUuid: '6f1c0a52-3b7e-4d1a-9c2e-1a7b9e0c4d05', estimatesDistance: false,
    primary: { label: 'Level', unit: 'level', step: 1, min: 1, max: 20, start: 6, up: 'Step faster', down: 'Step slower' },
    secondary: null,
    primaryAt: (comfort, pace, climb) => levelFrom(comfort, pace, climb),
    secondaryAt: (comfort) => comfort,
  },
];

export const machineById = (id: string): Machine => MACHINES.find((m) => m.id === id) ?? MACHINES[0];

/** The machine an exercise runs on, or null when a console program makes no sense (jump rope). */
export function machineForExercise(ex: Pick<Exercise, 'uuid' | 'title'> | null | undefined): Machine | null {
  if (!ex) return null;
  const direct = MACHINES.find((m) => m.exerciseUuid === ex.uuid);
  if (direct) return direct;
  const title = ex.title.toLowerCase();
  if (/treadmill/.test(title)) return machineById('treadmill');
  if (/bike|cycl|spin/.test(title)) return machineById('bike');
  if (/elliptical|cross ?trainer/.test(title)) return machineById('elliptical');
  if (/row(er|ing)/.test(title)) return machineById('rower');
  if (/stair|step ?mill/.test(title)) return machineById('stairs');
  return null;
}
