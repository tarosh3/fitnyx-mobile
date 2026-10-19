import { badgesFor, effortName, formatClock, formatKg, isRecent } from '@/src/features/progress/records';
import type { ProgressSummary } from '@/src/lib/api/progress';

const summary = (p: Partial<ProgressSummary> = {}): ProgressSummary => ({
  streak: { current_weeks: 2, best_weeks: 5, this_week: false },
  lifetime: { workouts: 32, volume_kg: 43619, roams: 10, distance_m: 38206 },
  records: { lifts: [{ exercise_uuid: 'b', name: 'Bench Press', e1rm_kg: 83.3, weight_kg: 62.5, reps: 10, date: '2026-10-14', sets: 8 }], efforts: [{ km: 5, sec: 1490, date: '2026-10-17', activity_id: 'r' }], longest_roam: null, most_climb: null },
  ...p,
});

describe('badgesFor', () => {
  it('earns badges from the summary and lists earned ones first', () => {
    const badges = badgesFor(summary());
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    expect(byId['first-workout'].earned).toBe(true);
    expect(byId['workouts-25'].earned).toBe(true);
    expect(byId['streak-4'].earned).toBe(true);
    expect(byId['tonnes-10'].earned).toBe(true);
    expect(byId['sub-25-5k'].earned).toBe(true);
    expect(byId['workouts-100']).toMatchObject({ earned: false, detail: '32 of 100 workouts', progress: 0.32 });
    expect(byId['km-100'].detail).toBe('38 of 100 km');
    const firstOpen = badges.findIndex((b) => !b.earned);
    expect(badges.slice(firstOpen).every((b) => !b.earned)).toBe(true);
  });

  it('handles a brand-new account', () => {
    const badges = badgesFor(summary({
      streak: { current_weeks: 0, best_weeks: 0, this_week: false },
      lifetime: { workouts: 0, volume_kg: 0, roams: 0, distance_m: 0 },
      records: { lifts: [], efforts: [], longest_roam: null, most_climb: null },
    }));
    expect(badges.every((b) => !b.earned)).toBe(true);
    expect(badges.find((b) => b.id === 'sub-25-5k')?.detail).toBe('Run 5 km in one Roam');
    expect(badges.find((b) => b.id === 'lift-100')?.progress).toBe(0);
  });
});

describe('formatting', () => {
  it('formats clock times, weights and effort names', () => {
    expect(formatClock(332)).toBe('5:32');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatKg(86.533)).toBe('86.5');
    expect(formatKg(112)).toBe('112');
    expect(effortName(5)).toBe('Fastest 5 km');
    expect(effortName(21)).toBe('Fastest half marathon');
  });

  it('marks records from the last 30 days as recent', () => {
    expect(isRecent('2026-09-20', '2026-10-19')).toBe(true);
    expect(isRecent('2026-09-19', '2026-10-19')).toBe(false);
  });
});
