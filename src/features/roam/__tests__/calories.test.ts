import { met, roamKcal } from '../calories';

// Same cases as backend internal/activity/calories_test.go (parity with the saved number).
describe('Roam calories', () => {
  it('interpolates MET by speed and clamps outside the table', () => {
    expect(met('walk', 4.8)).toBeCloseTo(3.5);
    expect(met('walk', 5.2)).toBeCloseTo(3.9);
    expect(met('walk', 1)).toBe(2.8);
    expect(met('walk', 12)).toBe(7.0);
    expect(met('run', 9.7)).toBeCloseTo(9.8);
    expect(met('cycle', 50)).toBe(15.8);
  });

  it('estimates kcal from distance, moving time and weight', () => {
    expect(roamKcal('run', 5000, 1800, 70)).toBe(367);
    expect(roamKcal('walk', 3000, 2250, 80)).toBe(184);
    expect(roamKcal('run', 5000, 1800, null)).toBe(0);
    expect(roamKcal('run', 5000, 0, 70)).toBe(0);
    // A Stride counts as the type it is saved as.
    expect(roamKcal('stride', 5000, 1800, 70)).toBe(roamKcal('run', 5000, 1800, 70));
    expect(roamKcal('stride', 3000, 2250, 80)).toBe(roamKcal('walk', 3000, 2250, 80));
  });
});
