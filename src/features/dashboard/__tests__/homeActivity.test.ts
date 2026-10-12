import type { DashboardSession } from '@/src/lib/api/dashboard';
import { getRecentTraining } from '../homeActivity';

function session(at: Date, overrides: Partial<DashboardSession> = {}): DashboardSession {
  return {
    id: at.toISOString(),
    plan_id: null,
    day_id: null,
    plan_name: '',
    workout_date: '',
    started_at: at.toISOString(),
    finished_at: at.toISOString(),
    status: 'completed',
    total_duration_sec: 1800,
    exercise_count: 0,
    total_sets: 0,
    total_volume_kg: 500,
    exercises: [],
    ...overrides,
  };
}

describe('getRecentTraining', () => {
  it('includes exactly seven local dates and ignores future, earlier, and unfinished sessions', () => {
    const today = new Date(2026, 9, 12, 12, 30);
    const result = getRecentTraining([
      session(new Date(2026, 9, 5, 23, 59)), // Eighth calendar day: outside.
      session(new Date(2026, 9, 6, 0, 0)), // First instant of the seven-day period.
      session(new Date(2026, 9, 4), {
        finished_at: new Date(2026, 9, 12, 0, 15).toISOString(),
        total_duration_sec: 900,
        total_volume_kg: 200,
      }), // Finish date wins over start date.
      session(new Date(2026, 9, 12, 23, 59), {
        finished_at: null,
        total_duration_sec: 600,
        total_volume_kg: 100,
      }), // Missing finish date falls back to start date.
      session(new Date(2026, 9, 13, 0, 0)), // Next day is exclusive.
      session(new Date(2026, 9, 12, 10), { status: 'in_progress' }),
      session(new Date(2026, 9, 12, 11), { status: 'abandoned' }),
    ], today);

    expect(result).toEqual({ workouts: 3, volume: 800, durationMinutes: 55, calories: 321 });
    expect(today).toEqual(new Date(2026, 9, 12, 12, 30));
  });

  it('uses local midnights across daylight-saving changes rather than seven 24-hour blocks', () => {
    // US DST ends November 1, 2026. This period contains a 25-hour day.
    const result = getRecentTraining([
      session(new Date(2026, 9, 28, 0, 0)),
      session(new Date(2026, 9, 27, 23, 59)),
      session(new Date(2026, 10, 3, 23, 59)),
      session(new Date(2026, 10, 4, 0, 0)),
    ], new Date(2026, 10, 3, 12));

    expect(result.workouts).toBe(2);
  });
});
