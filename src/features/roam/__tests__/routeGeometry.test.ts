import { endpoints, MAX_DRAWN_POINTS, routeBounds, routeLine, thinForDisplay, vehicleLines } from '@/src/features/roam/routeGeometry';

const route: [number, number][] = [
  [72.87, 19.07],
  [72.88, 19.08],
  [72.9, 19.1],
  [72.91, 19.12],
];

describe('routeGeometry', () => {
  it('thins long routes for display, keeping the first and last point', () => {
    const route = Array.from({ length: 5000 }, (_, i): [number, number] => [72 + i * 1e-5, 19]);
    const thin = thinForDisplay(route);
    expect(thin.length).toBeLessThanOrEqual(MAX_DRAWN_POINTS);
    expect(thin[0]).toEqual(route[0]);
    expect(thin[thin.length - 1]).toEqual(route[4999]);
    expect(thinForDisplay(route.slice(0, 10))).toHaveLength(10);
  });


  it('builds the route line only when there are 2+ points', () => {
    expect(routeLine(route).features).toHaveLength(1);
    expect(routeLine(route.slice(0, 1)).features).toHaveLength(0);
  });

  it('turns inclusive vehicle ranges into line segments, clamping bad indices', () => {
    const fc = vehicleLines(route, [
      [1, 2],
      [3, 99],
    ]);
    expect(fc.features.map((f) => f.geometry.coordinates)).toEqual([[route[1], route[2]]]);
  });

  it('marks start, and end only when finished', () => {
    expect(endpoints(route, false).features.map((f) => f.properties?.kind)).toEqual(['start']);
    expect(endpoints(route, true).features.map((f) => f.properties?.kind)).toEqual(['start', 'end']);
  });

  it('pads bounds as [west, south, east, north]', () => {
    const [w, s, e, n] = routeBounds(route)!;
    expect(w).toBeLessThan(72.87);
    expect(s).toBeLessThan(19.07);
    expect(e).toBeGreaterThan(72.91);
    expect(n).toBeGreaterThan(19.12);
    expect(routeBounds([])).toBeNull();
  });
});
