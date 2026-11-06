import { itemFromExercise, nextSkip, plannedForSwap, replaceItem, takenLabel, targetLine, toPlanned } from '../model';
import type { TodayItem, TodayWorkout } from '@/src/lib/api/todayWorkout';

const ex = (tracking_type: string) => ({ uuid: 'x', title: 'X', tracking_type, primary_muscles: [] }) as any;
const item = (tracking: string, fields: Partial<TodayItem>): TodayItem => ({
  exercise_uuid: 'x', part: 'chest', sets: 3, kind: 'up', note: 'n', exercise: ex(tracking), ...fields,
});

describe('targetLine', () => {
  it.each([
    ['weight', item('weight_reps', { reps: 8, weight_kg: 62.5 }), '3 × 8 · 62.5 kg'],
    ['no history asks for a weight, never invents one', item('weight_reps', { reps: 10 }), '3 × 10 · pick a weight'],
    ['assisted', item('assisted_reps', { reps: 8, assist_kg: 17.5 }), '3 × 8 · 17.5 kg help'],
    ['no help left', item('assisted_reps', { reps: 8, assist_kg: 0 }), '3 × 8 · no help'],
    ['bodyweight', item('reps', { reps: 12 }), '3 × 12'],
    ['weighted bodyweight', item('reps', { reps: 12, weight_kg: 10 }), '3 × 12 · 10 kg'],
    ['hold', item('duration', { duration_sec: 65 }), '3 × 1:05'],
    ['weighted hold', item('duration', { duration_sec: 45, weight_kg: 10 }), '3 × 0:45 · 10 kg'],
    ['carry', item('weight_distance', { distance_m: 25, weight_kg: 40 }), '3 × 25 m · 40 kg'],
    ['cardio', item('cardio', { sets: 1, duration_sec: 600 }), '10 min'],
    ['cardio with distance', item('cardio', { sets: 1, duration_sec: 1200, distance_m: 3000 }), '20 min · 3 km'],
  ])('%s', (_name, it, want) => {
    expect(targetLine(it)).toBe(want);
  });
});

describe('toPlanned', () => {
  it('carries every target to the logger row', () => {
    expect(toPlanned(item('weight_reps', { reps: 8, weight_kg: 60, rest_sec: 75 }), 2)).toMatchObject({
      exercise_uuid: 'x', exercise_order: 2, target_sets: 3, target_reps: 8, target_weight_kg: 60, rest_seconds: 75,
    });
  });
  it("puts assistance in the row's target weight, where the logger reads it", () => {
    expect(toPlanned(item('assisted_reps', { reps: 8, assist_kg: 20, weight_kg: 5 }), 0).target_weight_kg).toBe(20);
  });
});

describe('itemFromExercise', () => {
  it('keeps the amount of work and invents no weight', () => {
    const got = itemFromExercise(ex('weight_reps'), { sets: 4, reps: 6, rest_sec: 120 });
    expect(got).toMatchObject({ sets: 4, reps: 6, rest_sec: 120, kind: 'first' });
    expect(got.weight_kg).toBeUndefined();
  });
  it('gives each kind of exercise its own target', () => {
    expect(itemFromExercise(ex('cardio'), { sets: 4 })).toMatchObject({ sets: 1, duration_sec: 600 });
    expect(itemFromExercise(ex('duration'), { sets: 3 }).duration_sec).toBe(45);
    expect(itemFromExercise(ex('weight_distance'), { sets: 3 }).distance_m).toBe(20);
  });
});

it('only equipment can be taken', () => {
  expect(takenLabel({ equipment: [{ name: 'Smith Machine' }] } as any)).toBe('Machine taken?');
  expect(takenLabel({ equipment: [{ name: 'Bodyweight' }] } as any)).toBe('Swap this one');
  expect(takenLabel({ equipment: [] } as any)).toBe('Swap this one');
});

it('plannedForSwap keeps the row it replaces', () => {
  const row = { exercise_order: 1, target_sets: 4, target_reps: 6, rest_seconds: 90 } as any;
  expect(plannedForSwap(ex('weight_reps'), row)).toMatchObject({ exercise_uuid: 'x', exercise_order: 1, target_sets: 4, target_reps: 6, rest_seconds: 90 });
});

it('replaceItem changes only that exercise', () => {
  const plan = { tip: 'Pause on the press', items: [item('reps', { exercise_uuid: 'a' }), item('reps', { exercise_uuid: 'b' })] } as TodayWorkout;
  const next = item('reps', { exercise_uuid: 'c' });
  const got = replaceItem(plan, 'a', next);
  expect(got.items.map((i) => i.exercise_uuid)).toEqual(['c', 'b']);
  expect(got.tip).toBeUndefined();
});

describe('nextSkip', () => {
  it('remembers what was skipped', () => {
    expect(nextSkip(['back'], { parts: ['legs'] })).toEqual(['back']);
  });
  it('starts over once the server has come back round', () => {
    expect(nextSkip(['back', 'legs'], { parts: ['back'] })).toEqual([]);
  });
});
