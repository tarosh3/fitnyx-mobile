import { defaultActivityName } from '@/src/features/roam/activityName';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { decodePolyline, formatDuration } from '@/src/features/roam/geo';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import type { ActivityDetail } from '@/src/lib/api/activities';

// What a share card shows, built from a saved Roam or a finished workout.
// Pure, so the wording and formatting are unit-tested; ShareCard draws it.

export interface ShareStat {
  label: string;
  value: string;
  unit?: string;
}

export interface ShareCardData {
  kind: 'roam' | 'workout';
  /** Small caps line above the title: "RIDE COMPLETE". */
  eyebrow: string;
  title: string;
  /** "Thu, 15 Oct". */
  date: string;
  /** The big number. */
  hero: ShareStat;
  /** Up to three supporting stats. */
  stats: ShareStat[];
  /** Up to three short lines (workout bests / top lifts). */
  highlights: string[];
  /** Roam route as [lng, lat], for the line art. */
  route?: LngLatPair[];
  /** "+78 XP". */
  badge?: string;
}

const MAX_STATS = 3;

/** "Evening Ride" → "FitNyx-Evening-Ride.png" (shown when shared as a file). */
export function cardFileName(title: string): string {
  const slug = title.replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `FitNyx-${slug || 'Achievement'}.png`;
}

export function cardDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function distanceStat(m: number): ShareStat {
  return m >= 1000
    ? { label: 'Distance', value: (m / 1000).toFixed(2), unit: 'km' }
    : { label: 'Distance', value: String(Math.round(m)), unit: 'm' };
}

export function roamCardData(a: ActivityDetail): ShareCardData {
  const onFoot = a.activity_type !== 'cycle';
  const stats: ShareStat[] = [{ label: 'Moving time', value: formatDuration(a.moving_time_sec) }];
  if (onFoot && a.avg_pace_sec_per_km) stats.push({ label: 'Avg pace', value: formatDuration(a.avg_pace_sec_per_km), unit: '/km' });
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
    eyebrow: `${ACTIVITY_LABEL[a.activity_type].toUpperCase()} COMPLETE`,
    title: a.name || defaultActivityName(a.activity_type, a.started_at),
    date: cardDate(a.started_at),
    hero: distanceStat(a.distance_m),
    stats: stats.slice(0, MAX_STATS),
    highlights: [],
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
  exercises: number;
  prs: number;
  /** "Bench Press — 3 × 8 · 60 kg", new bests first. */
  highlights: string[];
  xp: number;
}

export function workoutCardData(w: WorkoutCardInput): ShareCardData {
  const clock = formatDuration(w.durationSec);
  const stats: ShareStat[] = [
    w.volumeKg > 0
      ? { label: 'Volume', value: Math.round(w.volumeKg).toLocaleString('en-US'), unit: 'kg' }
      : w.distanceM > 0
        ? distanceStat(w.distanceM)
        : { label: 'Exercises', value: String(w.exercises) },
    { label: 'Sets', value: String(w.sets) },
  ];
  if (w.prs > 0) stats.push({ label: w.prs === 1 ? 'New best' : 'New bests', value: String(w.prs) });
  return {
    kind: 'workout',
    eyebrow: 'WORKOUT COMPLETE',
    title: w.name,
    date: cardDate(w.startedAt),
    hero: { label: 'Duration', value: clock },
    stats: stats.slice(0, MAX_STATS),
    highlights: w.highlights.slice(0, 3),
    badge: w.xp > 0 ? `+${w.xp} XP` : undefined,
  };
}
