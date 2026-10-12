import { haversine, GAP_SEC } from '@/src/features/roam/geo';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';

// Route replay: turns a saved Roam into a timeline the map can play back —
// the line drawing itself at the pace it was travelled, coloured by speed.
// Pure functions (no React / map), so they're unit-tested.

/** A pause or GPS gap longer than this is skipped in the replay (shown as 1 s). */
const SKIP_GAP_SEC = GAP_SEC;
/** Speed is averaged over ±this many seconds of the replay, so colours don't flicker. */
const SPEED_HALF_WINDOW_SEC = 6;
/** Colour stops in the line gradient — plenty for a phone-sized map. */
const MAX_GRADIENT_STOPS = 120;

export interface ReplayTimeline {
  coords: LngLatPair[];
  /** Replay seconds at each point (pauses compressed). */
  t: number[];
  /** Distance to show at each point (m) — counts like the saved Roam, ends at its distance. */
  dist: number[];
  /** Moving time to show at each point (s) — ends at the saved moving time. */
  clock: number[];
  /** Fraction of the line's length at each point (MapLibre's line-progress). */
  progress: number[];
  /** Smoothed speed (m/s) around each point; vehicle stretches are excluded. */
  speed: number[];
  vehicle: boolean[];
  /** Speed range for the colour ramp (10th–90th percentile on foot/bike). */
  speedLo: number;
  speedHi: number;
  /** Where each whole km was reached. */
  kms: { km: number; coord: LngLatPair; t: number }[];
  /** Total replay seconds (before the playback speed-up). */
  duration: number;
  /** True when real timestamps were used; false = even pace (older Roams). */
  timed: boolean;
}

export interface ReplayInput {
  route: LngLatPair[];
  routeTimes?: number[];
  vehicleRanges?: [number, number][];
  distanceM: number;
  movingTimeSec: number;
}

function inRanges(ranges: [number, number][], from: number, to: number): boolean {
  return ranges.some(([a, b]) => from >= a && to <= b);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[i];
}

export function buildTimeline({ route, routeTimes, vehicleRanges = [], distanceM, movingTimeSec }: ReplayInput): ReplayTimeline | null {
  const n = route.length;
  if (n < 2) return null;

  const length = [0]; // geometric length along the line (m)
  const counted = [0]; // distance that counts (no vehicle stretches)
  const vehicle = [false];
  for (let i = 1; i < n; i++) {
    const [lng0, lat0] = route[i - 1];
    const [lng1, lat1] = route[i];
    const d = haversine(lat0, lng0, lat1, lng1);
    const inVehicle = inRanges(vehicleRanges, i - 1, i);
    vehicle.push(inVehicle);
    length.push(length[i - 1] + d);
    counted.push(counted[i - 1] + (inVehicle ? 0 : d));
  }
  const totalLength = length[n - 1];
  if (totalLength <= 0) return null;

  // Real timestamps when the backend sent a usable set; else an even pace.
  const timed =
    routeTimes?.length === n && routeTimes.every((v, i) => Number.isFinite(v) && (i === 0 || v >= routeTimes[i - 1]));
  const raw = timed ? routeTimes! : length.map((l) => (l / totalLength) * Math.max(movingTimeSec, 1));

  const t = [0];
  for (let i = 1; i < n; i++) {
    const dt = raw[i] - raw[i - 1];
    t.push(t[i - 1] + (dt > SKIP_GAP_SEC ? 1 : Math.max(0, dt)));
  }
  const duration = Math.max(t[n - 1], 1);

  const distScale = counted[n - 1] > 0 ? distanceM / counted[n - 1] : 0;
  const dist = counted.map((c) => c * distScale);
  const clock = t.map((v) => (v / duration) * movingTimeSec);
  const progress = length.map((l) => l / totalLength);

  // Speed around each point over a sliding replay-time window (two pointers).
  const speed: number[] = new Array(n).fill(0);
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < n; i++) {
    while (t[i] - t[lo] > SPEED_HALF_WINDOW_SEC) lo++;
    while (hi + 1 < n && t[hi + 1] - t[i] <= SPEED_HALF_WINDOW_SEC) hi++;
    // Sparse fixes can leave the window empty: always reach the neighbours.
    const a = Math.min(lo, Math.max(0, i - 1));
    const b = Math.max(hi, Math.min(n - 1, i + 1));
    const dt = t[b] - t[a];
    speed[i] = dt > 0 ? (dist[b] - dist[a]) / dt / (movingTimeSec > 0 ? movingTimeSec / duration : 1) : 0;
  }
  const footSpeeds = speed.filter((_, i) => !vehicle[i] && speed[i] > 0).sort((a, b) => a - b);
  let speedLo = percentile(footSpeeds, 0.1);
  let speedHi = percentile(footSpeeds, 0.9);
  if (speedHi - speedLo < 0.2) {
    // An even effort: centre a narrow band so it reads as one calm colour.
    speedLo -= 0.5;
    speedHi += 0.5;
  }

  const kms: ReplayTimeline['kms'] = [];
  let km = 1;
  for (let i = 1; i < n; i++) {
    while (km * 1000 <= dist[i] && km * 1000 <= distanceM) {
      const f = dist[i] === dist[i - 1] ? 0 : (km * 1000 - dist[i - 1]) / (dist[i] - dist[i - 1]);
      const [a, b] = [route[i - 1], route[i]];
      kms.push({ km, coord: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], t: t[i - 1] + (t[i] - t[i - 1]) * f });
      km++;
    }
  }

  return { coords: route, t, dist, clock, progress, speed, vehicle, speedLo, speedHi, kms, duration, timed };
}

export interface ReplayPosition {
  index: number;
  coord: LngLatPair;
  progress: number;
  distanceM: number;
  clockSec: number;
  speedMps: number;
  inVehicle: boolean;
  /** Heading in degrees clockwise from north (for the playhead arrow). */
  bearing: number;
}

/** Look this far along the route for the heading, so GPS jitter doesn't spin the arrow. */
const BEARING_LOOKAHEAD_M = 8;

function bearingDeg(from: LngLatPair, to: LngLatPair): number {
  const toRad = Math.PI / 180;
  const [lng1, lat1] = [from[0] * toRad, from[1] * toRad];
  const [lng2, lat2] = [to[0] * toRad, to[1] * toRad];
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Heading at a point: towards a point a few metres ahead (or from one behind, at the end). */
function headingAt(tl: ReplayTimeline, index: number, coord: LngLatPair): number {
  const n = tl.coords.length;
  for (let j = index + 1; j < n; j++) {
    const [lng, lat] = tl.coords[j];
    if (haversine(coord[1], coord[0], lat, lng) >= BEARING_LOOKAHEAD_M) return bearingDeg(coord, tl.coords[j]);
  }
  for (let j = index; j >= 0; j--) {
    const [lng, lat] = tl.coords[j];
    if (haversine(coord[1], coord[0], lat, lng) >= BEARING_LOOKAHEAD_M) return bearingDeg(tl.coords[j], coord);
  }
  return 0;
}

/** Where the replay is at `sec` replay-seconds (clamped to the ends). */
export function positionAt(tl: ReplayTimeline, sec: number): ReplayPosition {
  const n = tl.coords.length;
  const s = Math.min(Math.max(sec, 0), tl.duration);
  let lo = 0;
  let hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (tl.t[mid] <= s) lo = mid;
    else hi = mid;
  }
  const span = tl.t[hi] - tl.t[lo];
  const f = span > 0 ? Math.min(1, Math.max(0, (s - tl.t[lo]) / span)) : s >= tl.t[hi] ? 1 : 0;
  const lerp = (a: number[]) => a[lo] + (a[hi] - a[lo]) * f;
  const [a, b] = [tl.coords[lo], tl.coords[hi]];
  const coord: LngLatPair = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  return {
    index: f >= 1 ? hi : lo,
    coord,
    progress: lerp(tl.progress),
    distanceM: lerp(tl.dist),
    clockSec: lerp(tl.clock),
    speedMps: tl.speed[f >= 0.5 ? hi : lo],
    inVehicle: tl.vehicle[hi],
    bearing: headingAt(tl, lo, coord),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour for a speed on the ramp (slow → fast), as rgb(). */
export function rampColor(tl: ReplayTimeline, speedMps: number, ramp: readonly string[]): string {
  const x = Math.min(1, Math.max(0, (speedMps - tl.speedLo) / (tl.speedHi - tl.speedLo)));
  const pos = x * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(pos));
  const f = pos - i;
  const [r0, g0, b0] = hexToRgb(ramp[i]);
  const [r1, g1, b1] = hexToRgb(ramp[i + 1]);
  const mix = (p: number, q: number) => Math.round(p + (q - p) * f);
  return `rgb(${mix(r0, r1)}, ${mix(g0, g1)}, ${mix(b0, b1)})`;
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

/**
 * MapLibre `line-gradient` for the route, coloured by speed and drawn up to
 * `upTo` (line-progress, 0–1); the rest is transparent so the line appears to
 * draw itself. Needs `lineMetrics` on the GeoJSON source.
 */
export function gradientExpression(
  tl: ReplayTimeline,
  upTo: number,
  ramp: readonly string[],
  vehicleColor: string,
): unknown[] {
  const head = Math.min(1, Math.max(0, upTo));
  if (head <= 0) return ['interpolate', ['linear'], ['line-progress'], 0, TRANSPARENT, 1, TRANSPARENT];
  const colorAt = (i: number) => (tl.vehicle[i] ? vehicleColor : rampColor(tl, tl.speed[i], ramp));

  const stops: [number, string][] = [];
  let next = 0;
  for (let i = 0; i < tl.progress.length; i++) {
    const p = tl.progress[i];
    if (p > head) break;
    if (p + 1e-9 >= next || i === 0) {
      stops.push([p, colorAt(i)]);
      next = p + 1 / MAX_GRADIENT_STOPS;
    }
  }
  const tail = colorAt(Math.max(0, positionIndexAtProgress(tl, head)));
  if (!stops.length || stops[stops.length - 1][0] < head) stops.push([head, tail]);
  if (head < 1) stops.push([Math.min(1, head + 1e-4), TRANSPARENT]);
  if (stops[stops.length - 1][0] < 1) stops.push([1, head < 1 ? TRANSPARENT : tail]);

  const expr: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  let last = -1;
  for (const [p, c] of stops) {
    if (p <= last) continue; // interpolate needs strictly ascending stops
    expr.push(p, c);
    last = p;
  }
  if (expr.length < 7) expr.push(1, expr[expr.length - 1]); // at least two stops
  return expr;
}

function positionIndexAtProgress(tl: ReplayTimeline, p: number): number {
  let i = 0;
  while (i + 1 < tl.progress.length && tl.progress[i + 1] <= p) i++;
  return i;
}

/** How long the full replay takes at 1×: short Roams ~15 s, long ones up to ~40 s. */
export function playbackSeconds(movingTimeSec: number): number {
  return Math.min(40, Math.max(14, 10 + Math.sqrt(movingTimeSec / 60) * 3));
}
