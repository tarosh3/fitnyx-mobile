import {
  describeSet,
  describeTarget,
  draftToLog,
  beatLastHint,
  fmtClock,
  logToDraft,
  movementOf,
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

describe('movement thumbnails', () => {
  it.each([
    ['Barbell bench press', 'horizontal-press'],
    ['Dumbbell shoulder press', 'vertical-press'],
    ['Seated cable row', 'horizontal-pull'],
    ['Lat pulldown', 'vertical-pull'],
    ['Front squat', 'squat'],
    ['Romanian deadlift', 'hinge'],
    ['Bulgarian split squat', 'lunge'],
    ['Forearm plank', 'core-anti-extension'],
    ['Russian twist', 'core-rotation'],
    ['Farmer’s walk', 'carry'],
    ['Hammer curl', 'curl'],
    ['Overhead triceps extension', 'triceps-extension'],
    ['Standing calf raise', 'calf'],
    ['Treadmill running', 'cardio'],
    ['Push-up', 'horizontal-press'],
    ['Chin-up', 'vertical-pull'],
    ['Leg curl', null],
    ['Wrist curl', null],
    ['Dumbbell lateral raise', null],
  ])('maps %s without replacing unknown movements with misleading art', (title, expected) => {
    expect(movementOf({ title })).toBe(expected);
  });

  it('uses explicit movement categories and cardio tracking, with a safe missing-data fallback', () => {
    expect(movementOf({ title: 'Custom movement', category: 'horizontal-pull' })).toBe('horizontal-pull');
    expect(movementOf({ title: 'Row', tracking_type: 'cardio' })).toBe('cardio');
    expect(movementOf({ category: 'strength' })).toBeNull();
    expect(movementOf()).toBeNull();
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
  const d = { reps: 10, weightKg: 0, assistKg: 0, durationSec: 1200, distanceM: 3000 };
  it('sends only what each type measures', () => {
    expect(draftToLog('weight_reps', { ...d, weightKg: 60 })).toEqual({ actual_reps: 10, actual_weight_kg: 60 });
    expect(draftToLog('reps', d)).toEqual({ actual_reps: 10, actual_weight_kg: undefined });
    expect(draftToLog('duration', d)).toEqual({ actual_reps: 0, actual_duration_sec: 1200, actual_weight_kg: undefined });
    expect(draftToLog('duration', { ...d, weightKg: 10 })).toEqual({ actual_reps: 0, actual_duration_sec: 1200, actual_weight_kg: 10 });
    expect(draftToLog('assisted_reps', { ...d, assistKg: 25 })).toEqual({ actual_reps: 10, actual_assist_kg: 25 });
    expect(draftToLog('assisted_reps', d)).toEqual({ actual_reps: 10, actual_assist_kg: 0 });
    expect(draftToLog('weight_distance', { ...d, weightKg: 40 })).toEqual({ actual_reps: 0, actual_weight_kg: 40, actual_distance_m: 3000 });
    expect(draftToLog('cardio', d)).toEqual({ actual_reps: 0, actual_duration_sec: 1200, actual_distance_m: 3000 });
  });
});

describe('assisted, weighted-hold and carry sets', () => {
  it('assistance fills from the last set, the target, last time, then a default; 0 is a real value', () => {
    expect(prefill('assisted_reps', null, null, null)).toMatchObject({ assistKg: 20, reps: 8, weightKg: 0 });
    expect(prefill('assisted_reps', null, null, { reps: 6, assistKg: 15 })).toMatchObject({ assistKg: 15, reps: 6 });
    expect(prefill('assisted_reps', { target_weight_kg: 30 }, null, { assistKg: 15 })).toMatchObject({ assistKg: 30, weightKg: 0 });
    expect(prefill('assisted_reps', null, { assistKg: 0, reps: 5 }, { assistKg: 15 })).toMatchObject({ assistKg: 0, reps: 5 });
  });

  it('other types carry no assistance', () => {
    expect(prefill('weight_reps', null, null, { assistKg: 15 }).assistKg).toBe(0);
  });

  it('a carry starts from a weight and a distance', () => {
    expect(prefill('weight_distance', null, null, null)).toMatchObject({ weightKg: 20, distanceM: 20 });
  });

  it('describes each in words', () => {
    const s = { reps: 8, weight_kg: undefined, duration_sec: undefined, distance_m: undefined };
    expect(describeSet('assisted_reps', { ...s, assist_kg: 25 })).toBe('25 kg help × 8');
    expect(describeSet('assisted_reps', { ...s, assist_kg: 0 })).toBe('No help × 8');
    expect(describeSet('duration', { ...s, duration_sec: 60, weight_kg: 10 })).toBe('1:00 hold · +10 kg');
    expect(describeSet('duration', { ...s, duration_sec: 60 })).toBe('1:00 hold');
    expect(describeSet('weight_distance', { ...s, weight_kg: 40, distance_m: 30 })).toBe('40 kg · 30 m');
    expect(describeSet('cardio', { ...s, duration_sec: 1295, distance_m: 3100 })).toBe('21:35 · 3.1 km');
    expect(describeSet('cardio', { ...s, duration_sec: 1200 })).toBe('20 min');
    expect(describeTarget('assisted_reps', { target_sets: 3, target_reps: 8, target_weight_kg: 20 })).toBe('3 × 8 · 20 kg help');
    expect(describeTarget('weight_distance', { target_sets: 3, target_distance_m: 20, target_weight_kg: 40 })).toBe('3 × 20 m · 40 kg');
  });

  it('assistance survives the round trip from a logged set', () => {
    expect(logToDraft({ reps: 8, assist_kg: 12.5 })).toMatchObject({ assistKg: 12.5, weightKg: 0 });
  });
});

describe('beatLastHint', () => {
  it('asks for the smallest step up, in each type’s terms', () => {
    expect(beatLastHint('weight_reps', { weightKg: 60, reps: 10 })).toBe('60 kg × 11');
    expect(beatLastHint('reps', { reps: 12 })).toBe('13 reps');
    expect(beatLastHint('assisted_reps', { assistKg: 25, reps: 8 })).toBe('22.5 kg help × 8');
    expect(beatLastHint('assisted_reps', { assistKg: 0, reps: 8 })).toBe('No help × 9');
    expect(beatLastHint('duration', { durationSec: 60, weightKg: 10 })).toBe('1:05 hold · +10 kg');
    expect(beatLastHint('cardio', { durationSec: 1200, distanceM: 3000 })).toBe('3.1 km');
    expect(beatLastHint('cardio', { durationSec: 1200 })).toBe('21 min');
    expect(beatLastHint('weight_distance', { weightKg: 40, distanceM: 30 })).toBe('40 kg · 35 m');
  });

  it('says nothing with nothing to beat', () => {
    expect(beatLastHint('weight_reps', null)).toBeNull();
    expect(beatLastHint('weight_reps', { reps: 0, weightKg: 0 })).toBeNull();
    expect(beatLastHint('duration', { durationSec: 0 })).toBeNull();
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
