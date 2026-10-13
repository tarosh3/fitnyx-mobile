import { blockDone, type Block, nextSetNumber, pendingCount, pendingRows } from '../rows';

const bench = { uuid: 'bench', title: 'Bench Press', tracking_type: 'weight_reps' } as never;
const tread = { uuid: 'tread', title: 'Treadmill Run', tracking_type: 'cardio' } as never;
const log = (set: number, kg: number, reps: number) =>
  ({ id: `l${set}`, set_index: set, reps, weight_kg: kg, exercise_uuid: 'bench' }) as never;

const block = (over: Partial<Block>): Block => ({
  key: 'k', uuid: 'bench', planned: { target_sets: 3, target_reps: 10, target_weight_kg: 60 } as never,
  exercise: bench, logs: [], extraRows: 0, drafts: {}, last: { reps: 10, weightKg: 19 }, bestKg: 80, ...over,
});

describe('logger rows', () => {
  it('shows the planned sets, pre-filled from the routine target', () => {
    const rows = pendingRows(block({}));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ weightKg: 60, reps: 10 });
  });

  it('counts down as sets are logged and follows the last logged set', () => {
    const b = block({ logs: [log(1, 62.5, 8)] });
    expect(pendingCount(b)).toBe(2);
    expect(pendingRows(b)[0]).toMatchObject({ weightKg: 62.5, reps: 8 });
  });

  it('carries an edited row down to the rows below it', () => {
    const rows = pendingRows(block({ drafts: { 0: { reps: 12, weightKg: 50, durationSec: 0, distanceM: 0 } } }));
    expect(rows[1]).toMatchObject({ reps: 12, weightKg: 50 });
  });

  it('adds and removes rows', () => {
    expect(pendingCount(block({ extraRows: 1 }))).toBe(4);
    expect(pendingCount(block({ logs: [log(1, 60, 10)], extraRows: -2 }))).toBe(0);
  });

  it('gives exercises added mid-workout their own rows', () => {
    expect(pendingCount(block({ planned: null, exercise: tread, extraRows: 1 }))).toBe(1);
  });

  it('is done when every row is logged', () => {
    expect(blockDone(block({ logs: [log(1, 60, 10), log(2, 60, 10), log(3, 60, 10)] }))).toBe(true);
    expect(blockDone(block({}))).toBe(false);
  });

  it('numbers new sets after the highest logged one', () => {
    expect(nextSetNumber([{ set_index: 1 }, { set_index: 3 }])).toBe(4);
    expect(nextSetNumber([])).toBe(1);
  });
});
