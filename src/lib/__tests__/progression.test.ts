import { computeSuggestion } from '../progression';

describe('computeSuggestion', () => {
  it('returns null without a usable baseline', () => {
    expect(computeSuggestion(null)).toBeNull();
    expect(computeSuggestion(undefined)).toBeNull();
    expect(computeSuggestion({ weightKg: 0, reps: 8 })).toBeNull();
  });

  it('adds 2.5kg when target reps met (no RPE)', () => {
    expect(computeSuggestion({ weightKg: 60, reps: 8 }, 8)).toEqual({ weightKg: 62.5, reps: 8 });
  });

  it('adds a rep when under target reps', () => {
    expect(computeSuggestion({ weightKg: 60, reps: 6 }, 8)).toEqual({ weightKg: 60, reps: 7 });
  });

  it('bigger jump when RPE is easy (<=7)', () => {
    expect(computeSuggestion({ weightKg: 60, reps: 8, rpe: 6 }, 8)).toEqual({ weightKg: 65, reps: 8 });
  });

  it('holds when RPE is hard (>=9)', () => {
    expect(computeSuggestion({ weightKg: 60, reps: 8, rpe: 9 }, 8)).toEqual({ weightKg: 60, reps: 8 });
  });

  it('RPE 8 falls through to the reps rule', () => {
    expect(computeSuggestion({ weightKg: 60, reps: 8, rpe: 8 }, 8)).toEqual({ weightKg: 62.5, reps: 8 });
  });
});
