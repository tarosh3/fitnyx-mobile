// India is UTC+5:30: a workout at 02:00 local on 5 Oct is 20:30 UTC on 4 Oct.
process.env.TZ = 'Asia/Kolkata';

import { renderHook } from '@testing-library/react-native';

import { useActivityData } from '@/src/hooks/useActivityData';

const done = (iso: string) => ({ status: 'completed', started_at: iso, finished_at: iso });

describe('useActivityData', () => {
  it('buckets workouts by the local calendar day, not the UTC date', () => {
    const { result } = renderHook(() => useActivityData([done('2026-10-04T20:30:00.000Z')]));
    expect(result.current.days.get('2026-10-05')).toBe(1);
    expect(result.current.days.get('2026-10-04')).toBeUndefined();
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
