import { activityFromProgress, activityGoals, formatGoal, goalFraction, newMilestones, reachedMilestones, withHealthToday } from '../model';

const goals = { daily_distance_m: 5000, daily_burn_kcal: null, daily_steps: 6000, diet_kcal: 2000, diet_protein_g: null, weight_kg: 70 };

describe('goals model', () => {
  it('lists only the activity goals that are set, in order', () => {
    expect(activityGoals(goals)).toEqual([{ kind: 'distance', target: 5000 }, { kind: 'steps', target: 6000 }]);
    expect(activityGoals(null)).toEqual([]);
  });

  it('caps the fraction and handles a zero target', () => {
    expect(goalFraction(5000, 2500)).toBe(0.5);
    expect(goalFraction(5000, 9000)).toBe(1);
    expect(goalFraction(0, 10)).toBe(0);
  });

  it('reports milestones not announced yet, only "done" once a goal is reached', () => {
    const g = activityGoals(goals);
    const day = { distanceM: 2600, kcal: 0, steps: 6100 };
    expect(newMilestones(g, day, [])).toEqual([{ kind: 'distance', milestone: 'half' }, { kind: 'steps', milestone: 'done' }]);
    expect(newMilestones(g, day, ['distance:half', 'steps:done'])).toEqual([]);
    expect(newMilestones(g, { ...day, distanceM: 5000 }, ['distance:half'])).toEqual([{ kind: 'distance', milestone: 'done' }, { kind: 'steps', milestone: 'done' }]);
  });

  it('lists every milestone a day has reached (so a Roam never re-announces earlier ones)', () => {
    expect(reachedMilestones(activityGoals(goals), { distanceM: 5200, kcal: 0, steps: 3000 })).toEqual(['distance:half', 'distance:done', 'steps:half']);
  });

  it('reads a progress row, tolerating an older backend', () => {
    const row = { date: '2026-10-20', workouts: 1, workout_sec: 1, volume_kg: 0, sets: 0, roams: 1, roam_sec: 1, distance_m: 3200 };
    expect(activityFromProgress(row)).toEqual({ distanceM: 3200, kcal: 0, steps: 0 });
    expect(activityFromProgress({ ...row, kcal_burned: 410, steps: 3900 })).toEqual({ distanceM: 3200, kcal: 410, steps: 3900 });
  });

  it('formats each kind', () => {
    expect(formatGoal('distance', 3240)).toBe('3.2 km');
    expect(formatGoal('distance', 5000)).toBe('5 km');
    expect(formatGoal('distance', 21100)).toBe('21.1 km');
    expect(formatGoal('burn', 312.4)).toBe('312 kcal');
    expect(formatGoal('steps', 6000)).toBe('6,000 steps');
    expect(formatGoal('steps', 6000, false)).toBe('6,000');
  });

  describe('withHealthToday', () => {
    const day = { distanceM: 3000, kcal: 200, steps: 1500 };

    it('takes the larger per metric, never summing, and leaves distance alone', () => {
      expect(withHealthToday(day, { steps: 8000, activeKcal: 450 })).toEqual({ distanceM: 3000, kcal: 450, steps: 8000 });
    });

    it('keeps the server value when health is lower or null', () => {
      expect(withHealthToday(day, { steps: 100, activeKcal: null })).toEqual({ distanceM: 3000, kcal: 200, steps: 1500 });
      expect(withHealthToday(day, { steps: null, activeKcal: null })).toEqual(day);
    });
  });
});
