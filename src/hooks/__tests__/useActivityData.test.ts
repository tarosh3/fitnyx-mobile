import { renderHook } from '@testing-library/react-native';

import { useActivityData } from '@/src/hooks/useActivityData';

const done = (iso: string) => ({ status: 'completed', started_at: iso, finished_at: iso });

describe('useActivityData', () => {
  it('buckets workouts by the local calendar day, not the UTC date', () => {
    // 20:30 UTC is already the next day east of UTC (02:00 in India). The
    // expected key is computed in the machine's own zone, so this holds on
    // any CI timezone and fails on the old UTC-slice code wherever the two differ.
    const iso = '2026-10-04T20:30:00.000Z';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const { result } = renderHook(() => useActivityData([done(iso)]));
    expect(result.current.days.get(localKey)).toBe(1);
    expect(result.current.days.size).toBe(1);
  });

  it('never reports more active days than workouts', () => {
    const sessions = [
      done('2026-10-01T04:00:00.000Z'),
      done('2026-10-01T12:00:00.000Z'),
      done('2026-10-02T04:00:00.000Z'),
      { status: 'abandoned', started_at: '2026-10-03T04:00:00.000Z' },
    ];
    const { result } = renderHook(() => useActivityData(sessions));
    expect(result.current.totalWorkouts).toBe(3);
    expect(result.current.totalActiveDays).toBe(2);
    expect(result.current.maxStreak).toBe(2);
  });
});
