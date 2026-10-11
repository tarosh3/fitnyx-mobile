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
