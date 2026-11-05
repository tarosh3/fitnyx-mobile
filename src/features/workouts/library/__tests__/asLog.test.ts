import { asLog } from '@/src/features/workouts/library/text';
import { describeSet } from '@/src/features/workouts/model';

describe('asLog', () => {
  it('keeps the assistance, so history shows the help that was taken', () => {
    const set = { set_index: 1, reps: 8, weight_kg: null, assist_kg: 25, rpe: null };
    expect(describeSet('assisted_reps', asLog(set))).toBe('25 kg help × 8');
    expect(describeSet('assisted_reps', asLog({ ...set, assist_kg: 0 }))).toBe('No help × 8');
  });
});
