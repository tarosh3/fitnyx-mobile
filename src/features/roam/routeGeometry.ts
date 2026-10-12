import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

// Pure GeoJSON / bounds helpers for RouteMap (testable without the native map).

export type LngLatPair = [number, number];

/** Vehicle stretches as separate line features (drawn greyed out). */
export function vehicleLines(route: LngLatPair[], ranges: [number, number][]): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = ranges
    .map(([a, b]) => route.slice(Math.max(0, a), Math.min(route.length, b + 1)))
    .filter((coords) => coords.length >= 2)
    .map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }));
  return { type: 'FeatureCollection', features };
}

/** Most points the drawn line needs; more is invisible at map zoom. */
export const MAX_DRAWN_POINTS = 1000;

/**
 * Every k-th point (first and last always kept) so the line handed to the
 * native map stays small: a long Roam has thousands of fixes, and the live
 * screen re-sends the whole line on every new fix. Metrics never use this.
 */
export function thinForDisplay(route: LngLatPair[], max = MAX_DRAWN_POINTS): LngLatPair[] {
  if (route.length <= max) return route;
  const step = Math.ceil(route.length / (max - 1));
  const out: LngLatPair[] = [];
  for (let i = 0; i < route.length - 1; i += step) out.push(route[i]);
  out.push(route[route.length - 1]);
  return out;
}

export function routeLine(route: LngLatPair[]): FeatureCollection<LineString> {
  route = thinForDisplay(route);
  return {
    type: 'FeatureCollection',
    features:
      route.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }]
        : [],
  };
}

/** Start (and, when finished, end) markers; `kind` drives circle colour. */
export function endpoints(route: LngLatPair[], includeEnd: boolean): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];
  if (route.length > 0) {
    features.push({ type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: route[0] } });
  }
  if (includeEnd && route.length > 1) {
    features.push({
      type: 'Feature',
      properties: { kind: 'end' },
      geometry: { type: 'Point', coordinates: route[route.length - 1] },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** [west, south, east, north] around the route, padded so one point still frames. */
export function routeBounds(route: LngLatPair[]): [number, number, number, number] | null {
  if (route.length === 0) return null;
  let [w, s] = route[0];
  let [e, n] = route[0];
  for (const [lng, lat] of route) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  const pad = 0.0015; // ~150 m
  return [w - pad, s - pad, e + pad, n + pad];
}

/**
 * Projects the route into a width×height box (equirectangular, longitude
 * scaled by cos(latitude) so shapes aren't stretched), centred with `pad`
 * pixels of margin. For drawing the route without map tiles (offline).
 */
export function projectToBox(route: LngLatPair[], width: number, height: number, pad: number): [number, number][] {
  if (route.length === 0 || width <= 2 * pad || height <= 2 * pad) return [];
  const midLat = (Math.min(...route.map((p) => p[1])) + Math.max(...route.map((p) => p[1]))) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = route.map((p) => p[0] * kx);
  const ys = route.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const span = Math.max(spanX, spanY) || 1e-9; // one point / a straight line still draws
  const scale = Math.min((width - 2 * pad) / (spanX || span), (height - 2 * pad) / (spanY || span));
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  // North up: larger latitude → smaller y.
  return route.map((_, i) => [offX + (xs[i] - minX) * scale, height - (offY + (ys[i] - minY) * scale)]);
}

const EARTH_M_PER_DEG = 111320;

/** Rough metres between two [lng, lat] points (fine at route scale). */
function stepM(a: LngLatPair, b: LngLatPair): number {
  const kx = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * kx, b[1] - a[1]) * EARTH_M_PER_DEG;
}

/**
 * Evenly spaced direction marks along the route — one per ~70 m, 4 to 14 of
 * them (or exactly `count`) —
 * each with the heading of travel there (degrees from north, measured over
 * the next few metres so GPS jitter doesn't spin it). Drawn as chevrons on
 * the right of travel, they tell overlapping passes (out-and-back) apart.
 */
export function directionMarks(route: LngLatPair[], count?: number): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];
  if (route.length < 2) return { type: 'FeatureCollection', features };
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + stepM(route[i - 1], route[i]));
  const total = cum[cum.length - 1];
  if (total < 20) return { type: 'FeatureCollection', features };
  const n = count ?? Math.min(14, Math.max(4, Math.round(total / 70)));
  const every = total / (n + 1);
  const lookahead = Math.min(15, every / 2);
  let i = 0;
  for (let k = 1; k <= n; k++) {
    const at = every * k;
    while (i + 1 < route.length && cum[i + 1] < at) i++;
    const f = cum[i + 1] > cum[i] ? (at - cum[i]) / (cum[i + 1] - cum[i]) : 0;
    const a = route[i];
    const b = route[Math.min(i + 1, route.length - 1)];
    const p: LngLatPair = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    let j = i + 1;
    while (j < route.length - 1 && cum[j] - at < lookahead) j++;
    const q = route[j];
    const kx = Math.cos((p[1] * Math.PI) / 180);
    const bearing = ((Math.atan2((q[0] - p[0]) * kx, q[1] - p[1]) * 180) / Math.PI + 360) % 360;
    features.push({ type: 'Feature', properties: { bearing }, geometry: { type: 'Point', coordinates: p } });
  }
  return { type: 'FeatureCollection', features };
}
