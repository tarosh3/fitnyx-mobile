import { cardFileName, roamCardData, roamFact, setLoad, volumeFact, workoutCardData } from '@/src/features/share/cardData';
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
  splits: [
    { km: 1, sec: 331 },
    { km: 2, sec: 329 },
  ],
  ...over,
});

describe('roamCardData', () => {
  it('a run: distance hero, time, pace, steps, a playful fact and km splits for the receipt', () => {
    const d = roamCardData(roam({ steps: 6123 }));
    expect(d.kicker).toBe('RUN');
    expect(d.title).toMatch(/Run$/); // the default name
    expect(d.hero).toEqual({ label: 'Distance', value: '5.00', unit: 'km' });
    expect(d.stats).toEqual([
      { label: 'Time', value: '27:48' },
      { label: 'Pace', value: '5:33', unit: '/km' },
      { label: 'Steps', value: '6,123' },
    ]);
    expect(d.fact).toBe('≈ 13 laps of a track');
    expect(d.rows).toEqual([
      { name: 'KM 1', detail: '5:31' },
      { name: 'KM 2', detail: '5:29' },
    ]);
    expect(d.badge).toBe('+50 XP');
    expect(d.route).toHaveLength(3);
    expect(d.time).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
  });

  it('a ride: custom name, speed instead of pace, climb when known, no XP badge without XP', () => {
    const d = roamCardData(roam({ activity_type: 'cycle', name: 'Sunday loop', avg_speed_mps: 6.4, elevation_gain_m: 87.6, xp_eligible: false, xp: 0 }));
    expect(d.kicker).toBe('RIDE');
    expect(d.title).toBe('Sunday loop');
    expect(d.stats[1]).toEqual({ label: 'Avg speed', value: '23.0', unit: 'km/h' });
    expect(d.stats[2]).toEqual({ label: 'Climb', value: '88', unit: 'm' });
    expect(d.badge).toBeUndefined();
  });

  it('short distances show metres', () => {
    expect(roamCardData(roam({ distance_m: 605 })).hero).toEqual({ label: 'Distance', value: '605', unit: 'm' });
  });
});

describe('playful facts', () => {
  it('volume: the heaviest familiar thing it covers', () => {
    expect(volumeFact(30)).toBeUndefined();
    expect(volumeFact(160)).toBe('≈ 1.5 scooters lifted');
    expect(volumeFact(350)).toBe('≈ an auto-rickshaw lifted');
    expect(volumeFact(8420)).toBe('≈ a T-rex lifted');
    expect(volumeFact(12000 * 23)).toBe('≈ 23 city buses lifted');
  });

  it('roam: floors, laps, marathon share, Everests laid flat', () => {
    expect(roamFact({ activity_type: 'walk', distance_m: 3000, elevation_gain_m: 87 })).toBe('Climbed 29 floors');
    expect(roamFact({ activity_type: 'run', distance_m: 21100 })).toBe('50% of a marathon');
    expect(roamFact({ activity_type: 'run', distance_m: 42195 })).toBe('Marathon distance and beyond');
    expect(roamFact({ activity_type: 'cycle', distance_m: 19440 })).toBe('2.2× Everest, laid flat');
    expect(roamFact({ activity_type: 'walk', distance_m: 500 })).toBeUndefined();
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
    prs: 2,
    rows: [
      { name: 'Bench Press', detail: '60 kg × 8', pr: true },
      { name: 'Dips', detail: '12 reps', pr: true },
      { name: 'Squat', detail: '80 kg × 5' },
    ],
    bars: [480, 480, 0, 400],
    xp: 64,
  };

  it('strength: total lifted hero, time, sets, records, a fact and every exercise', () => {
    const d = workoutCardData(base);
    expect(d.kicker).toBe('WORKOUT');
    expect(d.hero).toEqual({ label: 'Total lifted', value: '8,420', unit: 'kg' });
    expect(d.stats).toEqual([
      { label: 'Time', value: '1:02:05' },
      { label: 'Sets', value: '18' },
      { label: 'Records', value: '2' },
    ]);
    expect(d.fact).toBe('≈ a T-rex lifted');
    expect(d.rows).toHaveLength(3);
    expect(d.bars).toEqual([480, 480, 400]); // empty sets left out
    expect(d.badge).toBe('+64 XP');
  });

  it('no weights: time is the hero; cardio shows distance', () => {
    const bodyweight = workoutCardData({ ...base, volumeKg: 0, prs: 0 });
    expect(bodyweight.hero).toEqual({ label: 'Time', value: '1:02:05' });
    expect(bodyweight.stats).toEqual([
      { label: 'Sets', value: '18' },
      { label: 'Exercises', value: '3' },
    ]);
    expect(bodyweight.fact).toBeUndefined();
    const cardio = workoutCardData({ ...base, volumeKg: 0, distanceM: 4200, prs: 0 });
    expect(cardio.stats[0]).toEqual({ label: 'Distance', value: '4.20', unit: 'km' });
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

it('setLoad: weight × reps, else reps, time or distance', () => {
  expect(setLoad({ reps: 8, weight_kg: 60 })).toBe(480);
  expect(setLoad({ reps: 12 })).toBe(12);
  expect(setLoad({ reps: 0, duration_sec: 45 })).toBe(45);
  expect(setLoad({ reps: 0, distance_m: 1200 })).toBe(1200);
});
