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

export function routeLine(route: LngLatPair[]): FeatureCollection<LineString> {
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
