import { gritLines, gritNote } from '../grit';

const base = { sets: 0, hard_sets: 0, prs: 0, routine: false, streak: false, too_short: false, capped: false, grit: 0 };

describe('Grit summary', () => {
  it('lists what earned points', () => {
    expect(gritLines({ ...base, sets: 5, hard_sets: 1, prs: 3, routine: true, streak: true, grit: 220 })).toEqual([
      { label: '5 sets done', points: 50 },
      { label: '1 hard set (RPE 8+)', points: 5 },
      { label: 'Every planned set done', points: 25 },
      { label: '3 new personal bests', points: 90 },
      { label: 'Weekly training goal reached', points: 50 },
    ]);
    expect(gritLines({ ...base, sets: 1, prs: 1 }).map((l) => l.label)).toEqual(['1 set done', '1 new personal best']);
  });

  it('explains a short or capped workout', () => {
    expect(gritNote({ ...base, too_short: true })).toMatch(/under 10 minutes/);
    expect(gritNote({ ...base, sets: 30, capped: true, grit: 100 })).toMatch(/cap of 400/);
    expect(gritNote({ ...base, sets: 3, grit: 30 })).toBeNull();
  });
});
