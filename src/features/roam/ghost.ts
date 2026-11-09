import { decodePolyline, haversine, type ActivityType } from '@/src/features/roam/geo';
import { buildTimeline } from '@/src/features/roam/replay';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import type { ActivityDetail, ActivitySummary } from '@/src/lib/api/activities';

// Race your past self: a saved Roam becomes a "ghost" that moves at the pace
// it was done. Both sides are measured in moving time (the clock Roam uses
// everywhere), so a stop at a crossing doesn't count against either. Pure
// functions, unit-tested.

type Split = { km: number; sec: number };
/** [moving seconds, metres] — rising in both. */
export type Curve = [number, number][];

/** Under this distance the gap is mostly GPS settling, so it isn't shown yet. */
export const RACE_WARMUP_M = 50;
/** The ghost is drawn on the map only when its route starts this close to yours. */
export const GHOST_NEAR_M = 250;
/** Shortest Roam worth racing. */
const MIN_GHOST_M = 200;
const MAX_PATH_POINTS = 400;
/** Best-effort distances (km), as the backend's records (`effortKms`). */
export const EFFORT_KMS = [1, 5, 10, 21];

/**
 * Moving time against distance, through every whole-km split (exact at each
 * km, an even pace in between) and on to the final distance.
 */
export function buildCurve(splits: Split[], distanceM: number, movingSec: number): Curve {
  const curve: Curve = [[0, 0]];
  let t = 0;
  for (const s of splits) {
    if (!(s.sec > 0)) break;
    t += s.sec;
    curve.push([t, s.km * 1000]);
  }
  const [lastT, lastM] = curve[curve.length - 1];
  if (distanceM > lastM && movingSec > lastT) curve.push([movingSec, distanceM]);
  return curve;
}

function lerpAt(curve: Curve, x: number, from: 0 | 1): number {
  const to = from === 0 ? 1 : 0;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (x <= b[from]) {
      const span = b[from] - a[from];
      return span > 0 ? a[to] + ((x - a[from]) / span) * (b[to] - a[to]) : b[to];
    }
  }
  return curve[curve.length - 1][to];
}

/** Metres covered after `sec` moving seconds (stays at the finish after it). */
export const distanceAt = (curve: Curve, sec: number) => (sec <= 0 ? 0 : lerpAt(curve, sec, 0));

/** Moving seconds to reach `m` metres; null past the curve's end. */
export function timeAt(curve: Curve, m: number): number | null {
  const [, end] = curve[curve.length - 1];
  if (m > end) return null;
  return m <= 0 ? 0 : lerpAt(curve, m, 1);
}

export const curveEnd = (curve: Curve) => curve[curve.length - 1];

export type RaceState =
  /** Too early to tell. */
  | { kind: 'warmup' }
  /** aheadSec / aheadM > 0 = in front of the ghost. */
  | { kind: 'racing'; aheadSec: number; aheadM: number; ghostM: number }
  /** Reached the ghost's finish; marginSec > 0 = beat it. */
  | { kind: 'done'; marginSec: number };

export interface Progress {
  distanceM: number;
  movingSec: number;
  splits: Split[];
}

export function raceState(ghost: Curve, me: Progress): RaceState {
  const [ghostSec, ghostM] = curveEnd(ghost);
  if (me.distanceM >= ghostM && ghostM > 0) {
    // When I crossed its finish line, from my own splits (exact at each km).
    const mine = buildCurve(me.splits, me.distanceM, me.movingSec);
    const at = timeAt(mine, ghostM) ?? me.movingSec;
    return { kind: 'done', marginSec: ghostSec - at };
  }
  if (me.distanceM < RACE_WARMUP_M) return { kind: 'warmup' };
  const ghostTime = timeAt(ghost, me.distanceM) ?? ghostSec;
  const ghostNow = distanceAt(ghost, me.movingSec);
  return { kind: 'racing', aheadSec: ghostTime - me.movingSec, aheadM: me.distanceM - ghostNow, ghostM: ghostNow };
}

/** 72 → "1:12", 8.4 → "0:08" (always minutes:seconds). */
export function formatGap(sec: number): string {
  const s = Math.round(Math.abs(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** One line for the lock screen / a heading: "0:12 ahead", "48 m behind", "Even". */
export function raceLine(state: RaceState): string | null {
  if (state.kind === 'warmup') return null;
  if (state.kind === 'done') {
    const m = Math.round(state.marginSec);
    return m === 0 ? 'Tied with your ghost' : m > 0 ? `Beat your ghost by ${formatGap(m)}` : `${formatGap(m)} behind your ghost`;
  }
  const s = Math.round(state.aheadSec);
  if (s === 0) return 'Level with your ghost';
  return `${formatGap(s)} ${s > 0 ? 'ahead' : 'behind'}`;
}

// --- The ghost itself ---

export interface GhostPath {
  coords: LngLatPair[];
  /** Counted metres at each point (ends at the Roam's distance). */
  dist: number[];
}

/** A saved Roam, ready to race (stored with the recording, so it works offline). */
export interface GhostTarget {
  activityId: string;
  title: string;
  startedAt: string;
  type: ActivityType;
  distanceM: number;
  movingSec: number;
  curve: Curve;
  /** For the dot on the map; null when the route can't be drawn. */
  path: GhostPath | null;
}

export function buildGhost(a: ActivityDetail, title: string): GhostTarget {
  const route = decodePolyline(a.route_polyline);
  const tl = buildTimeline({
    route, routeTimes: a.route_times, vehicleRanges: a.vehicle_ranges, distanceM: a.distance_m, movingTimeSec: a.moving_time_sec,
  });
  let path: GhostPath | null = null;
  if (tl) {
    const step = Math.max(1, Math.ceil(tl.coords.length / MAX_PATH_POINTS));
    const keep = tl.coords.map((_, i) => i).filter((i) => i % step === 0 || i === tl.coords.length - 1);
    path = { coords: keep.map((i) => tl.coords[i]), dist: keep.map((i) => tl.dist[i]) };
  }
  return {
    activityId: a.id, title, startedAt: a.started_at, type: a.activity_type,
    distanceM: a.distance_m, movingSec: a.moving_time_sec,
    curve: buildCurve(a.splits ?? [], a.distance_m, a.moving_time_sec), path,
  };
}

/** Where along its route the ghost is after `m` metres. */
export function coordAtDistance(path: GhostPath, m: number): LngLatPair | null {
  const n = path.coords.length;
  if (!n) return null;
  if (m <= path.dist[0]) return path.coords[0];
  for (let i = 1; i < n; i++) {
    if (m <= path.dist[i]) {
      const span = path.dist[i] - path.dist[i - 1];
      const f = span > 0 ? (m - path.dist[i - 1]) / span : 1;
      const [a, b] = [path.coords[i - 1], path.coords[i]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
  }
  return path.coords[n - 1];
}

/** True when the ghost's route starts near where this Roam started (same loop). */
export function startsNear(path: GhostPath | null, myStart: LngLatPair | undefined): boolean {
  if (!path?.coords.length || !myStart) return false;
  const [lng, lat] = path.coords[0];
  return haversine(lat, lng, myStart[1], myStart[0]) <= GHOST_NEAR_M;
}

/** Past Roams that can be raced with this Roam choice: same kind, long enough, newest first. */
export function raceCandidates(list: ActivitySummary[], choice: ActivityType): ActivitySummary[] {
  const onFoot = choice !== 'cycle';
  return list
    .filter((a) => (onFoot ? a.activity_type !== 'cycle' : a.activity_type === 'cycle'))
    .filter((a) => a.distance_m >= MIN_GHOST_M && a.moving_time_sec > 0 && !a.id.startsWith('pending-'))
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

// --- Best efforts within one Roam ---

export interface RoamEffort {
  km: number;
  sec: number;
  /** The km the stretch starts after (0 = from the start). */
  fromKm: number;
}

/**
 * The fastest run of `km` consecutive whole-km splits, for each distance —
 * the same rule as the backend's records (`progress.BestEfforts`).
 */
export function roamEfforts(splits: Split[], kms: number[] = EFFORT_KMS): RoamEffort[] {
  const out: RoamEffort[] = [];
  for (const k of kms) {
    if (splits.length < k) continue;
    let sum = 0;
    let best: RoamEffort | null = null;
    for (let i = 0; i < splits.length; i++) {
      sum += splits[i].sec;
      if (i >= k) sum -= splits[i - k].sec;
      if (i >= k - 1 && sum > 0 && (!best || sum < best.sec)) best = { km: k, sec: sum, fromKm: i - k + 1 };
    }
    if (best) out.push(best);
  }
  return out;
}
