export type Goal = 'warmup' | 'fatloss' | 'stamina' | 'speed' | 'hills' | 'recovery';
export type ProgramLength = 'short' | 'standard' | 'long';

export const GOALS: { key: Goal; label: string }[] = [
  { key: 'warmup', label: 'Warm up' },
  { key: 'fatloss', label: 'Lose weight' },
  { key: 'stamina', label: 'Build stamina' },
  { key: 'speed', label: 'Get faster' },
  { key: 'hills', label: 'Hills' },
  { key: 'recovery', label: 'Recover' },
];

export const LENGTHS: { key: ProgramLength; label: string }[] = [
  { key: 'short', label: 'Short' },
  { key: 'standard', label: 'Standard' },
  { key: 'long', label: 'Long' },
];

/**
 * One stretch at one effort. Effort is relative to what the user finds comfortable,
 * so one program fits a 5 km/h walker and a 12 km/h runner alike.
 */
export interface Phase {
  name: string;
  sec: number;
  /** 1 = comfortable pace; 0.6 = easy; 1.3 = hard. */
  pace: number;
  /** Incline above comfortable, in %. Negative = downhill, on treadmills that can. */
  climb?: number;
}

export interface Program {
  id: string;
  title: string;
  goal: Goal;
  level: 'Easy' | 'Moderate' | 'Hard';
  blurb: string;
  intro: Phase[];
  /** Repeated `reps[length]` times; this is what makes a program shorter or longer. */
  loop: Phase[];
  reps: Record<ProgramLength, number>;
  outro: Phase[];
  /** Built around walking and jogging: makes no sense on a bike or rower. */
  treadmillOnly?: boolean;
}

const p = (name: string, min: number, pace: number, climb = 0): Phase => ({ name, sec: Math.round(min * 60), pace, climb });
const warm = [p('Easy start', 2, 0.6), p('Find your rhythm', 2, 0.75)];
const cool = [p('Cool down', 2, 0.65), p('Easy finish', 1, 0.5)];

export const PROGRAMS: Program[] = [
  {
    id: 'warm-gentle', title: 'Easy Warm-up', goal: 'warmup', level: 'Easy',
    blurb: 'Wake your legs up and raise your heart rate, nothing more.',
    intro: [p('Easy start', 2, 0.55), p('Loosen up', 2, 0.7)],
    loop: [p('Pick it up', 1, 0.85)], reps: { short: 1, standard: 2, long: 4 },
    outro: [p('Settle', 1, 0.7)],
  },
  {
    id: 'warm-primer', title: 'Pre-Lift Primer', goal: 'warmup', level: 'Easy',
    blurb: 'Short pick-ups so you walk to the weights already warm.',
    intro: [p('Easy start', 2, 0.6)],
    loop: [p('Pick-up', 0.5, 1), p('Ease off', 1, 0.65)], reps: { short: 2, standard: 3, long: 5 },
    outro: [],
  },
  {
    id: 'fat-burn', title: 'Fat Burn Zone', goal: 'fatloss', level: 'Moderate',
    blurb: 'Long, steady work with gentle lifts. You can still talk the whole way.',
    intro: warm,
    loop: [p('Steady', 4, 0.85), p('Lift', 1, 1)], reps: { short: 3, standard: 5, long: 8 },
    outro: cool,
  },
  {
    id: 'incline-burn', title: 'Incline Walk Burn', goal: 'fatloss', level: 'Moderate', treadmillOnly: true,
    blurb: 'A brisk walk, then the hill does the work. Hard on calories, easy on knees.',
    intro: [p('Flat walk', 3, 0.6)],
    loop: [p('Gentle hill', 3, 0.62, 4), p('Steep hill', 3, 0.62, 7), p('Steepest', 2, 0.58, 10), p('Back down', 2, 0.6, 3)], reps: { short: 2, standard: 3, long: 5 },
    outro: [p('Flat walk', 3, 0.55)],
  },
  {
    id: 'walk-jog', title: 'Walk-Jog Burner', goal: 'fatloss', level: 'Moderate', treadmillOnly: true,
    blurb: 'Jog, walk, repeat. More burn than a steady pace in the same time.',
    intro: warm,
    loop: [p('Jog', 1, 1), p('Walk', 2, 0.6)], reps: { short: 5, standard: 8, long: 12 },
    outro: cool,
  },
  {
    id: 'run-walk', title: 'Run-Walk Starter', goal: 'stamina', level: 'Easy', treadmillOnly: true,
    blurb: 'New to running? Short jogs with plenty of walking. It adds up fast.',
    intro: warm,
    loop: [p('Jog', 1.5, 0.95), p('Walk', 2, 0.55)], reps: { short: 4, standard: 6, long: 8 },
    outro: cool,
  },
  {
    id: 'stamina-builder', title: 'Stamina Builder', goal: 'stamina', level: 'Moderate',
    blurb: 'Blocks at your own pace with a short breather. Your engine grows here.',
    intro: warm,
    loop: [p('Steady', 5, 0.9), p('Your pace', 5, 1), p('Breather', 2, 0.7)], reps: { short: 1, standard: 2, long: 3 },
    outro: cool,
  },
  {
    id: 'pyramid', title: 'The Pyramid', goal: 'stamina', level: 'Hard',
    blurb: 'One minute hard, then two, then three, and back down again. The top is the test.',
    intro: warm,
    loop: [
      p('Push 1 min', 1, 1.1), p('Recover', 1, 0.7), p('Push 2 min', 2, 1.1), p('Recover', 1, 0.7), p('Push 3 min', 3, 1.1), p('Recover', 1.5, 0.7),
      p('Push 2 min', 2, 1.1), p('Recover', 1, 0.7), p('Push 1 min', 1, 1.15), p('Recover', 1, 0.7),
    ],
    reps: { short: 1, standard: 2, long: 3 },
    outro: cool,
  },
  {
    id: 'finish-faster', title: 'Finish Faster', goal: 'stamina', level: 'Moderate',
    blurb: 'Starts easy and gets a little quicker every few minutes. Your last block is your best.',
    intro: [p('Easy start', 3, 0.7)],
    loop: [p('Step 1', 3, 0.8), p('Step 2', 3, 0.85), p('Step 3', 3, 0.9), p('Step 4', 3, 0.95), p('Step 5', 3, 1), p('Step 6', 3, 1.05)], reps: { short: 1, standard: 1, long: 2 },
    outro: cool,
  },
  {
    id: 'sprints', title: '30/30 Sprints', goal: 'speed', level: 'Hard',
    blurb: 'Thirty seconds flat out, thirty seconds to breathe. Short and brutal.',
    intro: warm,
    loop: [p('Sprint', 0.5, 1.35), p('Recover', 0.5, 0.6)], reps: { short: 8, standard: 12, long: 18 },
    outro: cool,
  },
  {
    id: 'ladder', title: 'Speed Ladder', goal: 'speed', level: 'Hard',
    blurb: 'Three rungs, each faster than the last, then a walk. Repeat and climb.',
    intro: warm,
    loop: [p('Rung 1', 1, 1.1), p('Rung 2', 1, 1.2), p('Rung 3', 1, 1.3), p('Recover', 1.5, 0.55)], reps: { short: 3, standard: 5, long: 7 },
    outro: cool,
  },
  {
    id: 'surges', title: 'Surges', goal: 'speed', level: 'Moderate',
    blurb: 'Change gear when you’re told to. Keeps your head switched on and your legs guessing.',
    intro: warm,
    loop: [p('Cruise', 2, 0.9), p('Surge', 0.75, 1.2), p('Settle', 1.5, 0.8), p('Big surge', 0.5, 1.35), p('Cruise', 2, 0.85), p('Surge', 1, 1.15)], reps: { short: 2, standard: 3, long: 4 },
    outro: cool,
  },
  {
    id: 'rolling-hills', title: 'Rolling Hills', goal: 'hills', level: 'Moderate',
    blurb: 'Up, over and down again, like a good outdoor route. Includes downhill if your machine can.',
    intro: warm,
    loop: [p('Flat', 2, 0.9), p('Up', 2, 0.85, 3), p('Steeper', 2, 0.8, 5), p('Over the top', 1, 0.85, 2), p('Downhill', 2, 1, -2), p('Up again', 2, 0.85, 4)], reps: { short: 2, standard: 3, long: 4 },
    outro: cool,
  },
  {
    id: 'mountain', title: 'Mountain Climb', goal: 'hills', level: 'Hard',
    blurb: 'One long climb. A little steeper every two minutes, all the way to the summit.',
    intro: [p('Foothills', 3, 0.65)],
    loop: [p('Climb', 2, 0.65, 1), p('Climb', 2, 0.65, 2), p('Climb', 2, 0.65, 3), p('Climb', 2, 0.65, 4), p('Climb', 2, 0.65, 5), p('Climb', 2, 0.65, 6), p('Climb', 2, 0.62, 7), p('Climb', 2, 0.62, 8), p('Summit', 2, 0.6, 10), p('Way down', 3, 0.65, 3)], reps: { short: 1, standard: 1, long: 2 },
    outro: [p('Flat', 2, 0.55)],
  },
  {
    id: 'recovery', title: 'Easy Recovery', goal: 'recovery', level: 'Easy',
    blurb: 'For tired legs. Keep it so easy it feels too easy. That’s the point.',
    intro: [p('Easy start', 3, 0.55)],
    loop: [p('Gentle', 5, 0.65)], reps: { short: 2, standard: 3, long: 5 },
    outro: [p('Easy finish', 2, 0.5)],
  },
];

export const programById = (id: string): Program | null => PROGRAMS.find((x) => x.id === id) ?? null;

export function phasesOf(program: Program, length: ProgramLength): Phase[] {
  const out = [...program.intro];
  for (let i = 0; i < program.reps[length]; i++) out.push(...program.loop);
  return [...out, ...program.outro];
}

export const minutesOf = (program: Program, length: ProgramLength): number =>
  Math.round(phasesOf(program, length).reduce((n, x) => n + x.sec, 0) / 60);

/** The goal to show first: warm up before lifting, finish with fat burn after, else what the user trains for. */
export function suggestedGoal(ctx: { inWorkout: boolean; setsLogged: number; profileGoal?: string | null }): Goal {
  if (ctx.inWorkout) return ctx.setsLogged > 0 ? 'fatloss' : 'warmup';
  if (ctx.profileGoal === 'lose_fat') return 'fatloss';
  if (ctx.profileGoal === 'reduce_stress' || ctx.profileGoal === 'improve_flexibility') return 'recovery';
  return 'stamina';
}
