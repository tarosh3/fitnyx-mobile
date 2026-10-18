import { elevationProfile, profilePath } from '@/src/features/roam/elevationProfile';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';

const route: LngLatPair[] = Array.from({ length: 501 }, (_, i) => [77.2 + i * 0.0001, 28.6]);

describe('elevationProfile', () => {
  it('pairs heights with distance along the route and thins them for drawing', () => {
    const elev = route.map((_, i) => 200 + (i < 250 ? i / 10 : (500 - i) / 10));
    const p = elevationProfile(route, elev, 100)!;
    expect(p.at[0]).toBe(0);
    expect(p.at[p.at.length - 1]).toBe(1);
    expect(p.at.length).toBeLessThanOrEqual(102);
    expect(p.min).toBe(200);
    expect(p.max).toBe(225);
    expect(p.lengthM).toBeGreaterThan(4800);
  });

  it('draws nothing it would have to guess: no elevations or a mismatched count', () => {
    expect(elevationProfile(route, undefined)).toBeNull();
    expect(elevationProfile(route, [])).toBeNull();
    expect(elevationProfile(route, [1, 2, 3])).toBeNull();
  });

  it('keeps a flat route looking flat (at least 10 m of vertical room)', () => {
    const flat = elevationProfile(route, route.map(() => 214))!;
    const { line, area } = profilePath(flat, 300, 80);
    const ys = line.slice(1).split('L').map((pt) => Number(pt.split(',')[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBe(0);
    expect(ys[0]).toBeCloseTo(40, 0); // centred
    expect(area.endsWith('L300,80L0,80Z')).toBe(true);
  });
});
