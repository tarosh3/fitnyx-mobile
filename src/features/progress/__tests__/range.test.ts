import {
  addDays,
  autoGran,
  bucketize,
  formatRange,
  granOptions,
  monthGrid,
  pctChange,
  previousRange,
  resolveGran,
  resolveRange,
  spanDays,
  sumDays,
  validateRange,
} from '@/src/features/progress/range';
import type { ProgressDay } from '@/src/lib/api/progress';

const day = (date: string, p: Partial<ProgressDay> = {}): ProgressDay => ({
  date, workouts: 0, workout_sec: 0, volume_kg: 0, sets: 0, roams: 0, roam_sec: 0, distance_m: 0, ...p,
});

const TODAY = '2026-10-19'; // a Monday

describe('ranges', () => {
  it('resolves presets ending today', () => {
    expect(resolveRange({ preset: '7d' }, TODAY)).toEqual({ from: '2026-10-13', to: TODAY });
    expect(spanDays(resolveRange({ preset: '30d' }, TODAY))).toBe(30);
    expect(spanDays(resolveRange({ preset: '1y' }, TODAY))).toBe(365);
    const custom = { from: '2026-08-01', to: '2026-08-31' };
    expect(resolveRange({ custom }, TODAY)).toBe(custom);
  });

  it('crosses month, year and DST boundaries by calendar day', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(spanDays({ from: '2024-02-28', to: '2024-03-01' })).toBe(3);
  });

  it('compares with the equally long period before', () => {
    expect(previousRange({ from: '2026-10-13', to: '2026-10-19' })).toEqual({ from: '2026-10-06', to: '2026-10-12' });
  });

  it('validates custom ranges', () => {
    expect(validateRange(null, TODAY, TODAY)).toBe('Pick both dates');
    expect(validateRange('2026-10-19', '2026-10-01', TODAY)).toMatch(/before/);
    expect(validateRange('2026-10-01', '2026-10-20', TODAY)).toMatch(/future/);
    expect(validateRange('2025-10-19', TODAY, TODAY)).toBeNull(); // 366 days
    expect(validateRange('2025-10-18', TODAY, TODAY)).toMatch(/367 days/);
  });

  it('formats ranges', () => {
    expect(formatRange({ from: '2026-08-01', to: '2026-10-19' })).toBe('1 Aug – 19 Oct 2026');
    expect(formatRange({ from: '2025-11-01', to: '2026-01-31' })).toBe('1 Nov 2025 – 31 Jan 2026');
  });
});

describe('grouping', () => {
  it('offers only groupings that make a readable chart', () => {
    expect(granOptions(7)).toEqual({ day: true, week: false, month: false });
    expect(granOptions(30)).toEqual({ day: true, week: true, month: true });
    expect(granOptions(365)).toEqual({ day: false, week: true, month: true });
    expect([7, 31, 90, 365].map(autoGran)).toEqual(['day', 'day', 'week', 'month']);
    expect(resolveGran('day', 365)).toBe('week');
    expect(resolveGran('month', 7)).toBe('day');
    expect(resolveGran('week', 30)).toBe('week');
  });

  it('buckets days into Monday weeks clipped to the range, keeping empty buckets', () => {
    const days = [day('2026-10-01', { workouts: 1, workout_sec: 3600 }), day('2026-10-05', { roams: 1, roam_sec: 1200, distance_m: 5000 }), day('2026-10-19', { workouts: 1 })];
    const b = bucketize(days, { from: '2026-10-01', to: '2026-10-19' }, 'week', TODAY);
    expect(b.map((x) => x.start)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(b[0]).toMatchObject({ workouts: 1, workoutSec: 3600, end: '2026-10-04' });
    expect(b[1]).toMatchObject({ roams: 1, distanceM: 5000, activeDays: 1 });
    expect(b[2].activeDays).toBe(0);
    expect(b[3].label).toBe('19 Oct');
  });

  it('labels a week of days by weekday and today', () => {
    const b = bucketize([], { from: '2026-10-13', to: TODAY }, 'day', TODAY);
    expect(b.map((x) => x.label)).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today']);
  });

  it('labels months with initials over a year and sparse labels otherwise', () => {
    const months = bucketize([], { from: '2025-10-20', to: TODAY }, 'month', TODAY);
    expect(months).toHaveLength(13);
    expect(months[months.length - 1].label).toBe('Oct');
    const days = bucketize([], { from: '2026-09-20', to: TODAY }, 'day', TODAY);
    expect(days.filter((x) => x.label).length).toBeLessThanOrEqual(8);
    expect(days[days.length - 1].label).toBe('19');
  });

  it('sums a range and computes changes', () => {
    const days = [day('2026-10-12', { workouts: 2, volume_kg: 100 }), day('2026-10-13', { workouts: 1, volume_kg: 50, roams: 1 })];
    expect(sumDays(days, { from: '2026-10-13', to: TODAY })).toMatchObject({ workouts: 1, volumeKg: 50, roams: 1, activeDays: 1 });
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
    expect(pctChange(5, 0)).toBeNull();
  });

  it('lays out a Monday-first month', () => {
    const grid = monthGrid(TODAY); // October 2026 starts on a Thursday
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });
});
