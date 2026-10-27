import { roamKind, roamToHealthWorkout, sessionToHealthWorkout } from '@/src/lib/health/map';
import type { ActivitySummary } from '@/src/lib/api/activities';

const roam = (over: Partial<ActivitySummary> = {}): ActivitySummary =>
  ({
    id: 'a', activity_type: 'run', started_at: '2026-10-27T06:00:00.000Z', ended_at: '2026-10-27T06:30:00.000Z',
    local_date: '2026-10-27', elapsed_time_sec: 1800, moving_time_sec: 1700, distance_m: 5000,
    avg_speed_mps: 2.9, max_speed_mps: 4, avg_pace_sec_per_km: 340, vehicle_distance_m: 0,
    vehicle_detected: false, xp_eligible: true, xp: 50, kcal: 320, ...over,
  }) as ActivitySummary;

describe('roamKind', () => {
  it('maps activity types', () => {
    expect(roamKind('run')).toBe('running');
    expect(roamKind('walk')).toBe('walking');
    expect(roamKind('stride')).toBe('walking');
    expect(roamKind('cycle')).toBe('cycling');
  });
});

describe('roamToHealthWorkout', () => {
  it('builds a workout with distance and energy', () => {
    const w = roamToHealthWorkout(roam());
    expect(w).not.toBeNull();
    expect(w!.kind).toBe('running');
    expect(w!.distanceM).toBe(5000);
    expect(w!.energyKcal).toBe(320);
    expect(w!.start.toISOString()).toBe('2026-10-27T06:00:00.000Z');
  });

  it('omits zero/absent distance and kcal', () => {
    const w = roamToHealthWorkout(roam({ distance_m: 0, kcal: null }));
    expect(w!.distanceM).toBeUndefined();
    expect(w!.energyKcal).toBeUndefined();
  });

  it('returns null when the time range is invalid', () => {
    expect(roamToHealthWorkout(roam({ ended_at: '2026-10-27T06:00:00.000Z' }))).toBeNull();
    expect(roamToHealthWorkout(roam({ started_at: 'nonsense' }))).toBeNull();
  });
});

describe('sessionToHealthWorkout', () => {
  it('derives end from duration and tags strength', () => {
    const w = sessionToHealthWorkout({ started_at: '2026-10-27T18:00:00.000Z', total_duration_sec: 3600, kcal: 250 });
    expect(w!.kind).toBe('strength');
    expect(w!.end.toISOString()).toBe('2026-10-27T19:00:00.000Z');
    expect(w!.energyKcal).toBe(250);
    expect(w!.distanceM).toBeUndefined();
  });

  it('returns null without a positive duration', () => {
    expect(sessionToHealthWorkout({ started_at: '2026-10-27T18:00:00.000Z', total_duration_sec: 0, kcal: null })).toBeNull();
  });
});
