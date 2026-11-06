import { focusReason, localFocusPart } from '@/src/features/workouts/usageRank';
import { partLabel, type Part } from '@/src/features/workouts/model';

const legs = { primary_muscles: [{ name: 'Quads', image: '', description: '' }], tracking_type: 'weight_reps' as const };
const abs = { primary_muscles: [{ name: 'Upper Abs', image: '', description: '' }], tracking_type: 'reps' as const };
const treadmill = { primary_muscles: [{ name: 'Cardio', image: '', description: '' }], tracking_type: 'cardio' as const };
const label = (p: string) => partLabel(p as Part);

describe('localFocusPart', () => {
  it('keeps to the part of the last strength exercise', () => {
    expect(localFocusPart([legs, legs])).toBe('legs');
    expect(localFocusPart([legs, abs])).toBe('core');
  });

  it('a cardio warm-up or finisher says nothing about the muscle', () => {
    expect(localFocusPart([treadmill])).toBeNull();
    expect(localFocusPart([treadmill, legs, treadmill])).toBe('legs');
  });

  it('has no opinion on an empty workout', () => {
    expect(localFocusPart([])).toBeNull();
  });
});

describe('focusReason', () => {
  const base = { current_part: 'legs', part: 'legs', streak: 3, switched: false, seen: 0, of: 0 };

  it('says nothing without history to point to', () => {
    expect(focusReason(base, label)).toBeNull();
  });

  it('names the habit and how sure it is', () => {
    expect(focusReason({ ...base, part: 'core', switched: true, seen: 4, of: 5 }, label)).toBe('You usually move to core after 3 leg exercises (4 of 5 times)');
    expect(focusReason({ ...base, part: 'core', switched: true, seen: 2, of: 2, streak: 1 }, label)).toBe('You usually move to core after 1 leg exercise (2 of 2 times)');
  });

  it('confirms staying on the part when that is the habit', () => {
    expect(focusReason({ ...base, seen: 3, of: 3 }, label)).toBe('What you usually do next on leg days');
  });
});
