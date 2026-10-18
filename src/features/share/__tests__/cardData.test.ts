import { cardFileName, roamCardData, workoutCardData } from '@/src/features/share/cardData';
import type { ActivityDetail } from '@/src/lib/api/activities';

const roam = (over: Partial<ActivityDetail> = {}): ActivityDetail => ({
  id: 'a1',
  activity_type: 'run',
  name: null,
  started_at: '2026-10-15T11:58:00Z',
  ended_at: '2026-10-15T12:30:00Z',
  local_date: '2026-10-15',
  elapsed_time_sec: 1900,
  moving_time_sec: 1668,
  distance_m: 5004,
  avg_speed_mps: 3,
  max_speed_mps: 4.5,
  avg_pace_sec_per_km: 333,
  vehicle_distance_m: 0,
  vehicle_detected: false,
  xp_eligible: true,
  xp: 50,
  route_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  vehicle_ranges: [],
  splits: [],
  ...over,
});

describe('roamCardData', () => {
  it('a run: distance hero, time, pace, then steps when there is no climb', () => {
    const d = roamCardData(roam({ steps: 6123 }));
    expect(d.eyebrow).toBe('RUN COMPLETE');
    expect(d.title).toMatch(/Run$/); // the default name ("Evening Run" etc.)
    expect(d.hero).toEqual({ label: 'Distance', value: '5.00', unit: 'km' });
    expect(d.stats).toEqual([
      { label: 'Moving time', value: '27:48' },
      { label: 'Avg pace', value: '5:33', unit: '/km' },
      { label: 'Steps', value: '6,123' },
    ]);
    expect(d.badge).toBe('+50 XP');
    expect(d.route).toHaveLength(3);
  });

  it('a ride: custom name, speed instead of pace, climb when known, no XP badge without XP', () => {
    const d = roamCardData(roam({ activity_type: 'cycle', name: 'Sunday loop', avg_speed_mps: 6.4, elevation_gain_m: 87.6, xp_eligible: false, xp: 0 }));
    expect(d.eyebrow).toBe('RIDE COMPLETE');
    expect(d.title).toBe('Sunday loop');
    expect(d.stats[1]).toEqual({ label: 'Avg speed', value: '23.0', unit: 'km/h' });
    expect(d.stats[2]).toEqual({ label: 'Climb', value: '88', unit: 'm' });
    expect(d.badge).toBeUndefined();
  });

  it('short distances show metres', () => {
    expect(roamCardData(roam({ distance_m: 605 })).hero).toEqual({ label: 'Distance', value: '605', unit: 'm' });
  });
});

describe('workoutCardData', () => {
  const base = {
    name: 'Push Day',
    startedAt: '2026-10-18T13:00:00Z',
    durationSec: 3725,
    volumeKg: 8420.4,
    distanceM: 0,
    sets: 18,
    exercises: 5,
    prs: 2,
    highlights: ['🏆 Bench Press — 3 × 8 · 60 kg', '🏆 Dips — 3 × 12', 'Squat · 4 sets', 'Row · 3 sets'],
    xp: 64,
  };

  it('strength: duration hero, volume, sets, new bests, top three highlights', () => {
    const d = workoutCardData(base);
    expect(d.eyebrow).toBe('WORKOUT COMPLETE');
    expect(d.hero).toEqual({ label: 'Duration', value: '1:02:05' });
    expect(d.stats).toEqual([
      { label: 'Volume', value: '8,420', unit: 'kg' },
      { label: 'Sets', value: '18' },
      { label: 'New bests', value: '2' },
    ]);
    expect(d.highlights).toHaveLength(3);
    expect(d.badge).toBe('+64 XP');
  });

  it('cardio shows distance; no bests means no bests stat', () => {
    const d = workoutCardData({ ...base, volumeKg: 0, distanceM: 4200, prs: 0, highlights: [] });
    expect(d.stats).toEqual([
      { label: 'Distance', value: '4.20', unit: 'km' },
      { label: 'Sets', value: '18' },
    ]);
  });
});

describe('cardFileName', () => {
  it('makes a readable file name', () => {
    expect(cardFileName('Evening Ride')).toBe('FitNyx-Evening-Ride.png');
    expect(cardFileName('  Push Day #3 💪 ')).toBe('FitNyx-Push-Day-3.png');
    expect(cardFileName('सुबह की सैर')).toMatch(/^FitNyx-सुबह/);
    expect(cardFileName('')).toBe('FitNyx-Achievement.png');
  });
});
