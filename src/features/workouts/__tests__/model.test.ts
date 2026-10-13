import {
  describeSet,
  describeTarget,
  draftToLog,
  fmtClock,
  partOf,
  partOfMuscle,
  prefill,
  routineChanges,
  totals,
  workoutXp,
} from '../model';

describe('body parts', () => {
  it('maps anatomy to groups', () => {
    expect(partOfMuscle('Pectoralis Major')).toBe('chest');
    expect(partOfMuscle('Latissimus Dorsi')).toBe('back');
    expect(partOfMuscle('Side Delts')).toBe('shoulders');
    expect(partOfMuscle('Triceps')).toBe('arms');
    expect(partOfMuscle('Quadriceps')).toBe('legs');
    expect(partOfMuscle('Upper Abs')).toBe('core');
    expect(partOfMuscle('Something odd')).toBeNull();
  });

  it('puts cardio exercises in cardio whatever their muscles say', () => {
    expect(partOf({ tracking_type: 'cardio', primary_muscles: [{ name: 'Quadriceps', image: '', description: '' }] })).toBe('cardio');
    expect(partOf({ primary_muscles: [{ name: 'Biceps', image: '', description: '' }] })).toBe('arms');
  });
});

describe('formatting', () => {
  it('formats clocks', () => {
    expect(fmtClock(45)).toBe('0:45');
    expect(fmtClock(3725)).toBe('1:02:05');
  });

  it('describes targets by tracking type', () => {
    expect(describeTarget('weight_reps', { target_sets: 3, target_reps: 10, target_weight_kg: 60 })).toBe('3 × 10 · 60 kg');
    expect(describeTarget('reps', { target_sets: 3, target_reps: 20 })).toBe('3 × 20');
    expect(describeTarget('duration', { target_sets: 2, target_duration_sec: 45 })).toBe('2 × 0:45');
    expect(describeTarget('cardio', { target_duration_sec: 1200, target_distance_m: 3000 })).toBe('20 min · 3 km');
  });

  it('describes logged sets', () => {
    expect(describeSet('weight_reps', { reps: 10, weight_kg: 60 })).toBe('60 kg × 10');
    expect(describeSet('reps', { reps: 20 })).toBe('20 reps');
    expect(describeSet('duration', { reps: 0, duration_sec: 45 })).toBe('0:45 hold');
    expect(describeSet('cardio', { reps: 0, duration_sec: 1200, distance_m: 3100 })).toBe('20 min · 3.1 km');
  });
});

describe('prefill', () => {
  it('uses the routine target before last time (the 19 kg vs 60 kg bug)', () => {
    const d = prefill('weight_reps', { target_reps: 10, target_weight_kg: 60 }, null, { reps: 10, weightKg: 19 });
    expect(d.weightKg).toBe(60);
  });

  it('follows the previous set in this workout first', () => {
    const d = prefill('weight_reps', { target_reps: 10, target_weight_kg: 60 }, { reps: 8, weightKg: 62.5 }, null);
    expect(d).toMatchObject({ reps: 8, weightKg: 62.5 });
  });

  it('falls back to last time, then defaults', () => {
    expect(prefill('weight_reps', null, null, { reps: 12, weightKg: 30 })).toMatchObject({ reps: 12, weightKg: 30 });
    expect(prefill('reps', null, null, null)).toMatchObject({ reps: 12, weightKg: 0 });
    expect(prefill('duration', null, null, null).durationSec).toBe(45);
    expect(prefill('cardio', null, null, null).durationSec).toBe(1200);
  });
});

describe('draftToLog', () => {
  const d = { reps: 10, weightKg: 0, durationSec: 1200, distanceM: 3000 };
  it('sends only what each type measures', () => {
    expect(draftToLog('weight_reps', { ...d, weightKg: 60 })).toEqual({ actual_reps: 10, actual_weight_kg: 60 });
    expect(draftToLog('reps', d)).toEqual({ actual_reps: 10, actual_weight_kg: undefined });
    expect(draftToLog('duration', d)).toEqual({ actual_reps: 0, actual_duration_sec: 1200 });
    expect(draftToLog('cardio', d)).toEqual({ actual_reps: 0, actual_duration_sec: 1200, actual_distance_m: 3000 });
  });
});

describe('summary', () => {
  const types: Record<string, 'weight_reps' | 'reps' | 'cardio'> = { bench: 'weight_reps', crunch: 'reps', tread: 'cardio' };
  it('totals volume, cardio and PRs', () => {
    const t = totals(
      [
        { exercise_uuid: 'bench', reps: 10, weight_kg: 60, is_warmup: false, is_pr: true },
        { exercise_uuid: 'bench', reps: 10, weight_kg: 60, is_warmup: false },
        { exercise_uuid: 'crunch', reps: 20, is_warmup: false },
        { exercise_uuid: 'tread', reps: 0, duration_sec: 1200, distance_m: 3100, is_warmup: false },
      ],
      (u) => types[u],
    );
    expect(t).toEqual({ sets: 4, volumeKg: 1200, cardioSec: 1200, distanceM: 3100, prs: 1 });
  });

  it('computes XP like the server', () => {
    expect(workoutXp(46 * 60, 4980)).toBe(300 + 230 + 50);
  });

  it('finds exercises added to or skipped from a routine', () => {
    expect(routineChanges(['bench', 'incline'], ['bench', 'crunch', 'crunch'])).toEqual({ added: ['crunch'], skipped: ['incline'] });
  });
});
