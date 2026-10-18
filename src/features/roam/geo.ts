// Live Roam metrics — a mirror of the backend's internal/activity/metrics.go.
// The backend recomputes everything on save and is authoritative (distance,
// time, XP); this copy only drives the live screen and the pre-save summary.
// Keep thresholds and rules in sync with the Go file.

export type ActivityType = 'run' | 'walk' | 'cycle';

/**
 * One GPS fix: [lat, lng, secondsSinceStart, accuracyMetres, segment, gpsSpeedMps,
 * stepsSinceStart, courseDeg, altitudeM]. Speed, steps and course are -1 when
 * unknown, altitude null; fixes recorded before a field was added stop short.
 * The upload sends the first seven; course and altitude stay on the device
 * (raw-track export for accuracy testing).
 */
export type RoamPoint = [number, number, number, number, number, number?, number?, number?, (number | null)?];

/** [start, end] seconds since the start that the phone reported as "in a vehicle". */
export type VehicleWindow = [number, number];

export const MAX_ACCURACY_M = 30;
export const MIN_STEP_M = 3;
export const STATIONARY_MPS = 0.3;
export const VEHICLE_SUSTAIN_SEC = 20;
export const GAP_SEC = 20;
/** Max speed = best average over any stretch of this much moving time. */
export const MAX_SPEED_WINDOW_SEC = 10;
/** Drift radius cap: unless the GPS speed shows movement, a move must clear the fixes' accuracy (≤ this). */
export const DRIFT_MAX_M = 15;
/** A GPS speed at least this means really moving (Android reports 0 when it has no speed). */
export const MOVING_DOPPLER_MPS = 0.7;
/** GPS speeds at both ends below this: the phone is standing still, whatever the positions say. */
export const STILL_DOPPLER_MPS = 0.5;
/** Distance comes from GPS speeds only across fixes at most this far apart. */
export const GPS_DISTANCE_MAX_GAP_SEC = 8;
/** Run/walk with pedometer data: no step for this long means the GPS movement isn't the user's. */
export const STEP_STILL_SEC = 15;
/** Inside a phone-reported vehicle period, movement at least this fast counts as vehicle travel. */
export const VEHICLE_WINDOW_MIN_MPS = 3;
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
  /** Steps while recording (pauses excluded); null without pedometer data. */
  steps: number | null;
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

/** Pedometer steps since the start at a fix; negative = unknown. */
function stepsOf(p: RoamPoint): number {
  return p[6] ?? -1;
}

/** GPS (Doppler) speed of a fix; negative = unknown. */
function gpsSpeed(p: RoamPoint): number {
  return p[5] ?? -1;
}

/**
 * Median-of-3 filter over the GPS speeds (each fix with its neighbours in the
 * same segment), so one bad reading moves neither distance nor max speed.
 * Unknown speeds stay unknown and don't vote; with two votes the lower wins.
 * Returns new tuples — the caller's points are never modified.
 */
function smoothSpeeds(route: RoamPoint[]): RoamPoint[] {
  return route.map((p, i): RoamPoint => {
    if (gpsSpeed(p) < 0) return p;
    const votes = [route[i - 1], p, route[i + 1]]
      .filter((q) => q !== undefined && q[4] === p[4] && gpsSpeed(q) >= 0)
      .map(gpsSpeed)
      .sort((x, y) => x - y);
    const out = [...p] as RoamPoint; // keep steps, course and altitude
    out[5] = votes.length === 3 ? votes[1] : votes[0];
    return out;
  });
}

/**
 * Whether the move from anchor a to fix p (prev = the fix before p) is only
 * GPS drift. With GPS speeds, two "still" readings in a row win over any
 * position wander, and two "moving" ones need only MIN_STEP_M (one stray
 * reading decides nothing). Otherwise the move must clear the drift radius.
 */
function isDrift(a: RoamPoint, prev: RoamPoint, p: RoamPoint, d: number, speeds: boolean): boolean {
  if (speeds) {
    const lo = Math.min(gpsSpeed(prev), gpsSpeed(p));
    const hi = Math.max(gpsSpeed(prev), gpsSpeed(p));
    if (lo >= 0 && hi < STILL_DOPPLER_MPS) return true;
    if (lo >= MOVING_DOPPLER_MPS) return d < MIN_STEP_M;
  }
  return d < driftRadius(a, p);
}

/**
 * Distance from route[from] to route[to] by integrating GPS speeds — immune to
 * the zig-zag of noisy positions. Null when a speed is missing (0 included:
 * that's Android without one) or fixes are too far apart to integrate.
 */
function gpsDistance(route: RoamPoint[], from: number, to: number): number | null {
  let d = 0;
  for (let j = from; j < to; j++) {
    const v0 = gpsSpeed(route[j]);
    const v1 = gpsSpeed(route[j + 1]);
    const dt = route[j + 1][2] - route[j][2];
    if (v0 <= 0 || v1 <= 0 || dt > GPS_DISTANCE_MAX_GAP_SEC) return null;
    d += ((v0 + v1) / 2) * dt;
  }
  return d;
}

/**
 * How far a still phone's fixes may wander: their accuracy, between MIN_STEP_M
 * and DRIFT_MAX_M (more when shaken: the OS stops pinning the position).
 */
function driftRadius(a: RoamPoint, p: RoamPoint): number {
  return Math.max(MIN_STEP_M, Math.min(Math.max(a[3], p[3]), DRIFT_MAX_M));
}

function buildIntervals(route: RoamPoint[], limit: number): Interval[] {
  const out: Interval[] = [];
  // Speeds of 0 only mean "still" if the device reports speeds at all.
  const speeds = route.some((p) => gpsSpeed(p) > 0);
  let anchor = -1;
  route.forEach((p, i) => {
    if (anchor < 0 || route[anchor][4] !== p[4]) {
      anchor = i; // new segment: never bridge a pause
      return;
    }
    const a = route[anchor];
    let dt = p[2] - a[2];
    if (dt <= 0) return;
    const d = haversine(a[0], a[1], p[0], p[1]);
    if (isDrift(a, route[i - 1], p, d, speeds)) return;
    // Phones send no fixes while still (the distance filter holds them), so
    // the first move after a stop spans the whole stop and reads as standing
    // still. When the GPS speed shows movement, time that move at that speed
    // instead — it counts, and the stop stays stopped.
    const v = gpsSpeed(p);
    if (d / dt < STATIONARY_MPS && v > STATIONARY_MPS) dt = Math.max(d / v, d / limit);
    // Moving distance from GPS speeds where they can be integrated, kept within
    // the positions' error bounds (so a bad speed reading can't run away) and,
    // unless the positions already flag it, within the human limit.
    const fast = d / dt > limit;
    const g = gpsDistance(route, anchor, i);
    let dist = d;
    if (g != null) {
      const r = driftRadius(a, p);
      dist = Math.min(Math.max(g, d - r), d + r);
      if (!fast) dist = Math.min(dist, limit * dt);
    }
    out.push({ from: anchor, to: i, d: dist, dt, fast });
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

/**
 * The phone's own "in a vehicle" periods flag intervals moving at vehicle-ish
 * speed — slower movement in such a window may be a misread walk and counts.
 */
function markVehicleWindows(route: RoamPoint[], intervals: Interval[], vehicle: boolean[], windows: VehicleWindow[]): void {
  intervals.forEach((iv, i) => {
    if (vehicle[i] || iv.d / iv.dt < VEHICLE_WINDOW_MIN_MPS) return;
    const mid = (route[iv.from][2] + route[iv.to][2]) / 2;
    if (windows.some(([a, b]) => mid >= a && mid <= b)) vehicle[i] = true;
  });
}

/** Pedometer counts mean something only if some are above 0 (like GPS speeds). */
function hasSteps(route: RoamPoint[]): boolean {
  return route.some((p) => stepsOf(p) > 0);
}

/** Intervals ending where the pedometer shows no step over the previous STEP_STILL_SEC (same segment). */
function steplessIntervals(route: RoamPoint[], intervals: Interval[]): boolean[] | null {
  if (!hasSteps(route)) return null;
  // last[i]: latest fix at or before i (same segment) with a known count, or -1.
  const last: number[] = [];
  route.forEach((p, i) => {
    last[i] = stepsOf(p) >= 0 ? i : i > 0 && route[i - 1][4] === p[4] ? last[i - 1] : -1;
  });
  return intervals.map((iv) => {
    const now = last[iv.to];
    if (now < 0) return false;
    for (let j = now - 1; j >= 0 && route[j][4] === route[now][4]; j--) {
      if (stepsOf(route[j]) >= 0 && route[now][2] - route[j][2] >= STEP_STILL_SEC) {
        return stepsOf(route[now]) - stepsOf(route[j]) <= 0;
      }
    }
    return false;
  });
}

/** Steps within each segment (paused steps don't count): the first from 0, later ones from their first count. */
function totalSteps(route: RoamPoint[]): number | null {
  if (!hasSteps(route)) return null;
  let total = 0;
  for (let i = 0; i < route.length; ) {
    let j = i;
    let base = -1;
    let top = -1;
    for (; j < route.length && route[j][4] === route[i][4]; j++) {
      const s = stepsOf(route[j]);
      if (s < 0) continue;
      if (base < 0) base = route[i][4] === 0 ? 0 : s;
      top = s;
    }
    if (top >= 0) total += Math.max(0, top - base);
    i = j;
  }
  return Math.round(total);
}

/** Computes live metrics for a track (same rules as the backend). */
export function computeStats(points: RoamPoint[], type: ActivityType, vehicleWindows: VehicleWindow[] = []): RoamStats {
  const route = smoothSpeeds(acceptedFixes(points));
  const intervals = buildIntervals(route, humanMaxMps(type));
  const vehicle = vehicleFlags(intervals);
  markVehicleWindows(route, intervals, vehicle, vehicleWindows);
  const stepless = type === 'run' || type === 'walk' ? steplessIntervals(route, intervals) : null;

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
    steps: totalSteps(route),
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
    if (stepless?.[i]) return; // no steps: the movement isn't the runner's
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
  // shorter than one window). GPS speeds catch the true peak, which a window
  // of positions averages away; the window still counts for tracks with few
  // or no GPS speeds (older app versions, Android fixes without a speed).
  stats.maxSpeedMps = Math.max(gpsMaxSpeed(route, counted, humanMaxMps(type)), maxWindowSpeed(counted), stats.avgSpeedMps);
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
/** GPS speeds read true speed at once, so the live value uses only this much of them. */
export const CURRENT_GPS_SPEED_WINDOW_SEC = 4;

/**
 * Speed right now, for the live screen (not saved; the backend never sees it).
 * Uses the GPS speeds when the fixes have them; otherwise averages the
 * movement in the last CURRENT_SPEED_WINDOW_SEC of the current segment,
 * ignoring jitter steps like the metrics do. Returns null without a
 * recent fix (GPS searching, or paused) and 0 when standing still.
 * `nowSec` is seconds since the recording started (same clock as the points).
 */
export function currentSpeedMps(points: RoamPoint[], nowSec: number): number | null {
  // Only the tail matters; at 1 fix / 2 s this covers the window many times over.
  const route = acceptedFixes(points.slice(-40));
  const last = route[route.length - 1];
  if (!last || nowSec - last[2] > CURRENT_SPEED_STALE_SEC) return null;
  // Median of the latest GPS speeds. All zeros may only mean Android has no
  // speed, so those fall back to the positions below.
  const gps = route
    .filter((p) => p[4] === last[4] && last[2] - p[2] <= CURRENT_GPS_SPEED_WINDOW_SEC && gpsSpeed(p) >= 0)
    .map(gpsSpeed)
    .sort((x, y) => x - y);
  if (gps.some((v) => v > 0)) {
    const v = gps[gps.length >> 1];
    return v < STATIONARY_MPS ? 0 : v;
  }
  let d = 0;
  let anchor = last;
  let first = last;
  for (let i = route.length - 2; i >= 0; i--) {
    const p = route[i];
    if (p[4] !== last[4] || last[2] - p[2] > CURRENT_SPEED_WINDOW_SEC) break;
    first = p;
    const step = haversine(p[0], p[1], anchor[0], anchor[1]);
    if (step >= driftRadius(p, anchor)) { // no GPS speeds to go on here
      d += step;
      anchor = p;
    }
  }
  const dt = last[2] - first[2];
  if (dt < 3) return null; // not enough recent fixes yet
  const v = d / dt;
  return v < STATIONARY_MPS ? 0 : v;
}

/** Highest (filtered) GPS speed at the end of a counted interval, capped at the activity's limit. */
function gpsMaxSpeed(route: RoamPoint[], ivs: Interval[], limit: number): number {
  let best = 0;
  for (const iv of ivs) best = Math.max(best, Math.min(gpsSpeed(route[iv.to]), limit));
  return best;
}

/** Highest average speed over consecutive counted intervals spanning ≥ the window. */
function maxWindowSpeed(ivs: Interval[]): number {
  // Running float sums drift by a few ulps (and differ from the backend's Go in
  // the last bit), so compare with a tolerance far below the 0.1 s time
  // resolution — an exact >= at the boundary picked different windows.
  const window = MAX_SPEED_WINDOW_SEC - 1e-6;
  let best = 0;
  let d = 0;
  let dt = 0;
  let left = 0;
  for (const iv of ivs) {
    d += iv.d;
    dt += iv.dt;
    while (left < ivs.length && dt - ivs[left].dt >= window) {
      d -= ivs[left].d;
      dt -= ivs[left].dt;
      left++;
    }
    if (dt >= window && d / dt > best) best = d / dt;
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
