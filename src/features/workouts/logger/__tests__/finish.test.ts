import { extraBlocks, routineWithExtras, targetsFromBlock } from '../finish';
import type { Block } from '../rows';

const log = (uuid: string, set: number, over: Record<string, unknown> = {}) =>
  ({ id: `${uuid}-${set}`, exercise_uuid: uuid, set_index: set, reps: 10, weight_kg: 60, ...over }) as never;
const block = (uuid: string, tracking: string, logs: unknown[]): Block =>
  ({ key: uuid, uuid, planned: null, exercise: { uuid, title: uuid, tracking_type: tracking }, logs, extraRows: 0, drafts: {}, last: null, bestKg: null }) as never;

const routine = {
  id: 'r1', title: 'Push', day_id: 'd1', last_done: null, created_at: '', updated_at: '',
  exercises: [{ id: 'x', day_id: 'd1', exercise_uuid: 'bench', exercise_order: 1, target_sets: 3, target_reps: 10, target_weight_kg: 60, rest_seconds: 120, created_at: '' }],
} as never;

describe('finish: update the routine with today’s extras', () => {
  const bench = block('bench', 'weight_reps', [log('bench', 1)]);
  const plank = block('plank', 'duration', [log('plank', 1, { reps: 0, weight_kg: null, duration_sec: 60 }), log('plank', 2, { reps: 0, weight_kg: null, duration_sec: 45 })]);
  const untouched = block('crunch', 'reps', []);

  it('offers only exercises that were done and are not in the routine', () => {
    expect(extraBlocks([bench, plank, untouched], routine).map((b) => b.uuid)).toEqual(['plank']);
    expect(extraBlocks([bench, plank], null)).toEqual([]);
  });

  it('turns what was done into targets for next time', () => {
    expect(targetsFromBlock(plank)).toEqual({ exercise_uuid: 'plank', target_sets: 2, target_reps: undefined, target_weight_kg: undefined, target_duration_sec: 60, target_distance_m: undefined });
    const tread = block('tread', 'cardio', [log('tread', 1, { reps: 0, weight_kg: null, duration_sec: 1200, distance_m: 3000 })]);
    expect(targetsFromBlock(tread)).toMatchObject({ target_sets: 1, target_duration_sec: 1200, target_distance_m: 3000 });
  });

  it('keeps the routine as it is and appends the extras', () => {
    const input = routineWithExtras(routine, [plank]);
    expect(input.title).toBe('Push');
    expect(input.exercises.map((e) => e.exercise_uuid)).toEqual(['bench', 'plank']);
    expect(input.exercises[0]).toMatchObject({ target_sets: 3, target_reps: 10, target_weight_kg: 60, rest_seconds: 120 });
  });
});
