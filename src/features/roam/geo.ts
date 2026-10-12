// Live Roam metrics — a mirror of the backend's internal/activity/metrics.go.
// The backend recomputes everything on save and is authoritative (distance,
// time, XP); this copy only drives the live screen and the pre-save summary.
// Keep thresholds and rules in sync with the Go file.

export type ActivityType = 'run' | 'walk' | 'cycle';

/** One GPS fix: [lat, lng, secondsSinceStart, accuracyMetres, segment]. */
export type RoamPoint = [number, number, number, number, number];

export const MAX_ACCURACY_M = 30;
export const MIN_STEP_M = 3;
export const STATIONARY_MPS = 0.3;
export const VEHICLE_SUSTAIN_SEC = 20;
export const GAP_SEC = 20;
/** Max speed = best average over any stretch of this much moving time. */
export const MAX_SPEED_WINDOW_SEC = 10;
export const MIN_ELIGIBLE_DISTANCE_M = 200;
export const MIN_ELIGIBLE_MOVING_SEC = 60;

/** Fastest sustainable human speed: 25 km/h on foot, 60 km/h on a bike. */
export function humanMaxMps(type: ActivityType): number {
  return (type === 'cycle' ? 60 : 25) / 3.6;
}

export interface RoamStats {
  distanceM: number;
  movingTimeSec: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  avgPaceSecPerKm: number | null;
  vehicleDistanceM: number;
  vehicleDetected: boolean;
  /** True when the most recent movement was at vehicle speed (live banner). */
  inVehicleNow: boolean;
  xpEligible: boolean;
  /** Accepted fixes as [lng, lat] (map order) and vehicle index ranges into it. */
  route: [number, number][];
  vehicleRanges: [number, number][];
  splits: { km: number; sec: number }[];
}

const EARTH_RADIUS_M = 6371000;

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

interface Interval {
  from: number;
  to: number;
  d: number;
  dt: number;
  fast: boolean;
}

function acceptedFixes(points: RoamPoint[]): RoamPoint[] {
  return points
    .filter(
      ([lat, lng, t, acc]) =>
        acc <= MAX_ACCURACY_M &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
        Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(t),
    )
    .sort((a, b) => a[2] - b[2]);
}

function buildIntervals(route: RoamPoint[], limit: number): Interval[] {
  const out: Interval[] = [];
  let anchor = -1;
  route.forEach((p, i) => {
    if (anchor < 0 || route[anchor][4] !== p[4]) {
      anchor = i; // new segment: never bridge a pause
      return;
    }
    const a = route[anchor];
    const dt = p[2] - a[2];
    if (dt <= 0) return;
    const d = haversine(a[0], a[1], p[0], p[1]);
    if (d < MIN_STEP_M) return; // jitter
    out.push({ from: anchor, to: i, d, dt, fast: d / dt > limit });
    anchor = i;
  });
  return out;
}

function vehicleFlags(intervals: Interval[]): boolean[] {
  const vehicle = intervals.map(() => false);
  for (let i = 0; i < intervals.length; ) {
    if (!intervals[i].fast) {
      i++;
      continue;
    }
    let j = i;
    let dur = 0;
    let jump = false;
    while (j < intervals.length && intervals[j].fast) {
      dur += intervals[j].dt;
      if (intervals[j].dt >= GAP_SEC) jump = true;
      j++;
    }
    if (dur >= VEHICLE_SUSTAIN_SEC || jump) {
      for (let k = i; k < j; k++) vehicle[k] = true;
    }
    i = j;
  }
  return vehicle;
}

/** Computes live metrics for a track (same rules as the backend). */
export function computeStats(points: RoamPoint[], type: ActivityType): RoamStats {
  const route = acceptedFixes(points);
  const intervals = buildIntervals(route, humanMaxMps(type));
  const vehicle = vehicleFlags(intervals);

  const stats: RoamStats = {
    distanceM: 0,
    movingTimeSec: 0,
    avgSpeedMps: 0,
    maxSpeedMps: 0,
    avgPaceSecPerKm: null,
    vehicleDistanceM: 0,
    vehicleDetected: false,
    inVehicleNow: false,
    xpEligible: false,
    route: route.map(([lat, lng]) => [lng, lat]),
    vehicleRanges: [],
    splits: [],
  };

  let moving = 0;
  const counted: Interval[] = []; // intervals that count, in order — for max speed
  let lastCrossT = 0;
  let nextKm = 1;
  intervals.forEach((iv, i) => {
    if (vehicle[i]) {
      stats.vehicleDistanceM += iv.d;
      return;
    }
    if (iv.fast) return; // short burst: GPS glitch
    const v = iv.d / iv.dt;
    if (v < STATIONARY_MPS) return;
    while (stats.distanceM + iv.d >= nextKm * 1000) {
      const crossT = moving + ((nextKm * 1000 - stats.distanceM) / iv.d) * iv.dt;
      stats.splits.push({ km: nextKm, sec: Math.round(crossT - lastCrossT) });
      lastCrossT = crossT;
      nextKm++;
    }
    stats.distanceM += iv.d;
    moving += iv.dt;
    counted.push(iv);
  });

  // Vehicle index ranges (consecutive vehicle intervals collapsed).
  for (let i = 0; i < intervals.length; i++) {
    if (!vehicle[i]) continue;
    const start = intervals[i].from;
    while (i + 1 < intervals.length && vehicle[i + 1] && intervals[i + 1].from === intervals[i].to) i++;
    stats.vehicleRanges.push([start, intervals[i].to]);
  }

  stats.movingTimeSec = Math.round(moving);
  if (moving > 0) stats.avgSpeedMps = stats.distanceM / moving;
  // The best stretch can't be slower than the whole (also covers Roams
  // shorter than one window).
  stats.maxSpeedMps = Math.max(maxWindowSpeed(counted), stats.avgSpeedMps);
  if (stats.distanceM >= 100 && moving > 0) {
    stats.avgPaceSecPerKm = Math.round(moving / (stats.distanceM / 1000));
  }
  stats.vehicleDetected = stats.vehicleDistanceM > 0;
  // Live banner: the latest movement is part of a (so-far) fast run. A run
  // still under VEHICLE_SUSTAIN_SEC isn't flagged yet, so also check the tail.
  const last = intervals.length - 1;
  stats.inVehicleNow = last >= 0 && (vehicle[last] || trailingFastSec(intervals) >= VEHICLE_SUSTAIN_SEC);
  stats.xpEligible =
    stats.distanceM >= MIN_ELIGIBLE_DISTANCE_M &&
    stats.movingTimeSec >= MIN_ELIGIBLE_MOVING_SEC &&
    stats.vehicleDistanceM <= stats.distanceM;
  return stats;
}

/** Live "current speed" averages this much recent movement — smooth, still responsive. */
export const CURRENT_SPEED_WINDOW_SEC = 8;
/** No fix for this long: GPS is lost, so there's no current speed to show. */
export const CURRENT_SPEED_STALE_SEC = 12;

/**
 * Speed right now, for the live screen (not saved; the backend never sees it).
 * Averages the movement in the last CURRENT_SPEED_WINDOW_SEC of the current
 * segment, ignoring jitter steps like the metrics do. Returns null without a
 * recent fix (GPS searching, or paused) and 0 when standing still.
 * `nowSec` is seconds since the recording started (same clock as the points).
 */
export function currentSpeedMps(points: RoamPoint[], nowSec: number): number | null {
  // Only the tail matters; at 1 fix / 2 s this covers the window many times over.
  const route = acceptedFixes(points.slice(-40));
  const last = route[route.length - 1];
  if (!last || nowSec - last[2] > CURRENT_SPEED_STALE_SEC) return null;
  let d = 0;
  let anchor = last;
  let first = last;
  for (let i = route.length - 2; i >= 0; i--) {
    const p = route[i];
    if (p[4] !== last[4] || last[2] - p[2] > CURRENT_SPEED_WINDOW_SEC) break;
    first = p;
    const step = haversine(p[0], p[1], anchor[0], anchor[1]);
    if (step >= MIN_STEP_M) {
      d += step;
      anchor = p;
    }
  }
  const dt = last[2] - first[2];
  if (dt < 3) return null; // not enough recent fixes yet
  const v = d / dt;
  return v < STATIONARY_MPS ? 0 : v;
}

/** Highest average speed over consecutive counted intervals spanning ≥ the window. */
function maxWindowSpeed(ivs: Interval[]): number {
  let best = 0;
  let d = 0;
  let dt = 0;
  let left = 0;
  for (const iv of ivs) {
    d += iv.d;
    dt += iv.dt;
    while (left < ivs.length && dt - ivs[left].dt >= MAX_SPEED_WINDOW_SEC) {
      d -= ivs[left].d;
      dt -= ivs[left].dt;
      left++;
    }
    if (dt >= MAX_SPEED_WINDOW_SEC && d / dt > best) best = d / dt;
  }
  return best;
}

function trailingFastSec(intervals: Interval[]): number {
  let sec = 0;
  for (let i = intervals.length - 1; i >= 0 && intervals[i].fast; i--) sec += intervals[i].dt;
  return sec;
}

/** Decodes a Google-encoded polyline (precision 5) to [lng, lat] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

// --- Formatting ---

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Readable duration for totals and summaries: "1h 34m", "28m 6s", "45s". */
export function formatDurationHuman(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
  return `${s}s`;
}

export function formatSpeed(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}
