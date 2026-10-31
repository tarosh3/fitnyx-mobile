import type { ExerciseUsage } from '@/src/lib/api/exercises';
import { rankUsage, recoveryWeight, sortAlphabetical } from '../usageRank';

const u = (uuid: string, title: string, part: string, sessions: number, group_days_ago: number | null, last_used = '2026-10-01'): ExerciseUsage => ({
  exercise: { uuid, title } as never,
  sessions,
  last_used,
  part,
  group_days_ago,
});

describe('recoveryWeight', () => {
  it('demotes groups trained today/yesterday and restores recovered ones', () => {
    expect(recoveryWeight(0)).toBe(0.2);
    expect(recoveryWeight(1)).toBe(0.2);
    expect(recoveryWeight(2)).toBe(0.5);
    expect(recoveryWeight(3)).toBe(1);
    expect(recoveryWeight(null)).toBe(1);
  });
});

describe('rankUsage (default view, recovery-aware)', () => {
  it('floats the group you are due for above one you just trained', () => {
    // Chest trained yesterday (recovering) but done often; back 3 days ago (due).
    const items = [
      u('c1', 'Bench Press', 'chest', 10, 1), // 10 * 0.2 = 2.0
      u('b1', 'Barbell Row', 'back', 5, 3), // 5 * 1 = 5.0
      u('l1', 'Squat', 'legs', 4, 5), // 4 * 1 = 4.0
    ];
    const ranked = rankUsage(items, null).map((i) => i.exercise.uuid);
    expect(ranked).toEqual(['b1', 'l1', 'c1']);
  });

  it('keeps raw frequency order when nothing is recently trained', () => {
    const items = [u('a', 'A', 'back', 3, 4), u('b', 'B', 'legs', 9, 5), u('c', 'C', 'core', 6, null)];
    expect(rankUsage(items, null).map((i) => i.exercise.uuid)).toEqual(['b', 'c', 'a']);
  });
});

describe('rankUsage (explicit part filter)', () => {
  it('shows only that part, by frequency, ignoring recovery', () => {
    const items = [
      u('c1', 'Incline Press', 'chest', 4, 1),
      u('c2', 'Bench Press', 'chest', 12, 1),
      u('b1', 'Row', 'back', 20, 3),
    ];
    const ranked = rankUsage(items, 'chest').map((i) => i.exercise.uuid);
    expect(ranked).toEqual(['c2', 'c1']); // back excluded; chest by sessions even though recovering
  });
});

describe('sortAlphabetical', () => {
  it('orders by title', () => {
    expect(sortAlphabetical([{ title: 'Zercher' }, { title: 'Bench' }]).map((x) => x.title)).toEqual(['Bench', 'Zercher']);
  });
});
