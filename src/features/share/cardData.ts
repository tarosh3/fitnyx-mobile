import { defaultActivityName } from '@/src/features/roam/activityName';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { decodePolyline, formatDuration } from '@/src/features/roam/geo';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import type { ActivityDetail } from '@/src/lib/api/activities';

// What a share card shows, built from a saved Roam or a finished workout.
// Pure, so the wording and formatting are unit-tested; the templates draw it.

export interface ShareStat {
  label: string;
  value: string;
  unit?: string;
}

/** A receipt / list line: an exercise with its best set, or a km split. */
export interface ShareRow {
  name: string;
  detail: string;
  pr?: boolean;
}

export interface ShareCardData {
  kind: 'roam' | 'workout';
  /** "RIDE" / "WORKOUT" — the activity, in caps. */
  kicker: string;
  title: string;
  /** "Thu, 15 Oct" and "5:28 pm". */
  date: string;
  time: string;
  /** The big number and what it measures. */
  hero: ShareStat;
  /** Up to three supporting stats. */
  stats: ShareStat[];
  /** One playful comparison: "≈ 3 auto-rickshaws lifted". */
  fact?: string;
  /** Exercises (workout) or km splits (Roam), for lists and the receipt. */
  rows: ShareRow[];
  /** Roam route as [lng, lat], for the line art. */
  route?: LngLatPair[];
  /** Workout: each set's load in the order done — "the shape of the workout". */
  bars?: number[];
  /** "+78 XP". */
  badge?: string;
}

const MAX_STATS = 3;
const MAX_ROWS = 8;

/** "Evening Ride" → "FitNyx-Evening-Ride.png" (shown when shared as a file). */
export function cardFileName(title: string): string {
  const slug = title.replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `FitNyx-${slug || 'Achievement'}.png`;
}

export function cardDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function cardTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

function distanceStat(m: number): ShareStat {
  return m >= 1000
    ? { label: 'Distance', value: (m / 1000).toFixed(2), unit: 'km' }
    : { label: 'Distance', value: String(Math.round(m)), unit: 'm' };
}

const oneDecimal = (n: number) => (n < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString('en-US'));

// Things people can picture, heaviest last. Familiar in India first.
const WEIGHTS: [singular: string, plural: string, kg: number][] = [
  ['a bag of cement', 'bags of cement', 50],
  ['a scooter', 'scooters', 110],
  ['an auto-rickshaw', 'auto-rickshaws', 350],
  ['a grand piano', 'grand pianos', 450],
  ['a car', 'cars', 1200],
  ['an SUV', 'SUVs', 2200],
  ['an elephant', 'elephants', 5000],
  ['a T-rex', 'T-rexes', 8000],
  ['a city bus', 'city buses', 12000],
];

/** "≈ 2.4 elephants lifted": the heaviest familiar thing the volume covers at least once. */
export function volumeFact(kg: number): string | undefined {
  if (kg < WEIGHTS[0][2]) return undefined;
  const [one, many, w] = [...WEIGHTS].reverse().find(([, , weight]) => kg >= weight)!;
  const n = kg / w;
  // "≈ 1.1 T-rexes" reads clumsily — within 15% of one, it's just "a T-rex".
  return n < 1.15 ? `≈ ${one} lifted` : `≈ ${oneDecimal(n)} ${many} lifted`;
}

const EVEREST_M = 8849;
const MARATHON_M = 42195;

/** One playful line for a Roam: floors climbed, track laps, marathon share, or Everests laid flat. */
export function roamFact(a: Pick<ActivityDetail, 'activity_type' | 'distance_m' | 'elevation_gain_m'>): string | undefined {
  if (a.elevation_gain_m != null && a.elevation_gain_m >= 15) return `Climbed ${Math.round(a.elevation_gain_m / 3)} floors`;
  if (a.activity_type === 'cycle') {
    return a.distance_m >= EVEREST_M ? `${oneDecimal(a.distance_m / EVEREST_M)}× Everest, laid flat` : undefined;
  }
  if (a.distance_m >= MARATHON_M) return 'Marathon distance and beyond';
  if (a.distance_m >= 10000) return `${Math.round((a.distance_m / MARATHON_M) * 100)}% of a marathon`;
  if (a.distance_m >= 800) return `≈ ${oneDecimal(a.distance_m / 400)} laps of a track`;
  return undefined;
}

export function roamCardData(a: ActivityDetail): ShareCardData {
  const onFoot = a.activity_type !== 'cycle';
  const stats: ShareStat[] = [{ label: 'Time', value: formatDuration(a.moving_time_sec) }];
  if (onFoot && a.avg_pace_sec_per_km) stats.push({ label: 'Pace', value: formatDuration(a.avg_pace_sec_per_km), unit: '/km' });
  else stats.push({ label: 'Avg speed', value: (a.avg_speed_mps * 3.6).toFixed(1), unit: 'km/h' });
  if (a.elevation_gain_m != null && a.elevation_gain_m >= 1) {
    stats.push({ label: 'Climb', value: String(Math.round(a.elevation_gain_m)), unit: 'm' });
  } else if (onFoot && a.steps) {
    stats.push({ label: 'Steps', value: a.steps.toLocaleString('en-IN') });
  } else {
    stats.push({ label: 'Top speed', value: (a.max_speed_mps * 3.6).toFixed(1), unit: 'km/h' });
  }
  return {
    kind: 'roam',
    kicker: ACTIVITY_LABEL[a.activity_type].toUpperCase(),
    title: a.name || defaultActivityName(a.activity_type, a.started_at),
    date: cardDate(a.started_at),
    time: cardTime(a.started_at),
    hero: distanceStat(a.distance_m),
    stats: stats.slice(0, MAX_STATS),
    fact: roamFact(a),
    rows: a.splits.slice(0, MAX_ROWS).map((s) => ({ name: `KM ${s.km}`, detail: formatDuration(s.sec) })),
    route: decodePolyline(a.route_polyline),
    badge: a.xp_eligible && a.xp > 0 ? `+${a.xp} XP` : undefined,
  };
}

export interface WorkoutCardInput {
  name: string;
  startedAt: string;
  durationSec: number;
  volumeKg: number;
  distanceM: number;
  sets: number;
  prs: number;
  /** Each exercise with its best set ("60 kg × 8"); `pr` when it set a record. */
  rows: ShareRow[];
  /** Each set's load in the order done (see setLoad). */
  bars: number[];
  xp: number;
}

/** How big a set was, for the bar chart: weight × reps, else reps, time or distance. */
export function setLoad(s: { reps: number; weight_kg?: number; duration_sec?: number; distance_m?: number }): number {
  if (s.weight_kg && s.reps) return s.weight_kg * s.reps;
  if (s.reps) return s.reps;
  if (s.duration_sec) return s.duration_sec;
  return s.distance_m ?? 0;
}

export function workoutCardData(w: WorkoutCardInput): ShareCardData {
  const clock = formatDuration(w.durationSec);
  const lifted = w.volumeKg > 0;
  const third: ShareStat = w.prs > 0 ? { label: w.prs === 1 ? 'Record' : 'Records', value: String(w.prs) } : { label: 'Exercises', value: String(w.rows.length) };
  const stats: ShareStat[] = lifted
    ? [{ label: 'Time', value: clock }, { label: 'Sets', value: String(w.sets) }, third]
    : w.distanceM > 0
      ? [distanceStat(w.distanceM), { label: 'Sets', value: String(w.sets) }, third]
      : [{ label: 'Sets', value: String(w.sets) }, third];
  return {
    kind: 'workout',
    kicker: 'WORKOUT',
    title: w.name,
    date: cardDate(w.startedAt),
    time: cardTime(w.startedAt),
    hero: lifted ? { label: 'Total lifted', value: Math.round(w.volumeKg).toLocaleString('en-US'), unit: 'kg' } : { label: 'Time', value: clock },
    stats: stats.slice(0, MAX_STATS),
    fact: lifted ? volumeFact(w.volumeKg) : undefined,
    rows: w.rows.slice(0, MAX_ROWS),
    bars: w.bars.filter((b) => b > 0),
    badge: w.xp > 0 ? `+${w.xp} XP` : undefined,
  };
}
