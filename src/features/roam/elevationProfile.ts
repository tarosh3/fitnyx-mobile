import { haversine } from '@/src/features/roam/geo';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';

export interface ElevationProfileData {
  /** Fraction of the route's length (0–1) for each sample — same scale as the replay's progress. */
  at: number[];
  /** Ground height in metres for each sample. */
  heights: number[];
  min: number;
  max: number;
  /** Route length in metres along the route points. */
  lengthM: number;
}

/**
 * Pairs the saved per-point elevations with distance along the route and thins
 * them to at most `samples` points for drawing. Null when there's nothing to
 * draw (no elevations, or a different count than the route — never guess).
 */
export function elevationProfile(route: LngLatPair[], elevations: number[] | undefined, samples = 120): ElevationProfileData | null {
  if (!elevations || elevations.length < 2 || elevations.length !== route.length) return null;
  const cum = [0];
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + haversine(route[i - 1][1], route[i - 1][0], route[i][1], route[i][0]));
  }
  const lengthM = cum[cum.length - 1];
  if (lengthM <= 0) return null;
  const step = Math.max(1, Math.ceil(route.length / samples));
  const at: number[] = [];
  const heights: number[] = [];
  for (let i = 0; i < route.length; i += step) {
    at.push(cum[i] / lengthM);
    heights.push(elevations[i]);
  }
  if (at[at.length - 1] !== 1) {
    at.push(1);
    heights.push(elevations[elevations.length - 1]);
  }
  return { at, heights, min: Math.min(...elevations), max: Math.max(...elevations), lengthM };
}

/** SVG path for the profile in a w×h box (a flat route still gets a visible band). */
export function profilePath(p: ElevationProfileData, w: number, h: number, pad = 4): { line: string; area: string } {
  const span = Math.max(p.max - p.min, 10); // ≥10 m of vertical room, so flat routes look flat
  const mid = (p.max + p.min) / 2;
  const y = (v: number) => pad + (1 - ((v - (mid - span / 2)) / span)) * (h - 2 * pad);
  const pts = p.at.map((a, i) => `${(a * w).toFixed(1)},${y(p.heights[i]).toFixed(1)}`);
  const line = `M${pts.join('L')}`;
  return { line, area: `${line}L${w},${h}L0,${h}Z` };
}
