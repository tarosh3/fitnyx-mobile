import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { decodePolyline, haversine } from '@/src/features/roam/geo';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import { getActivityHeatmap, type HeatmapRoute } from '@/src/lib/api/activities';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';

export interface HeatmapLine {
  id: string;
  type: HeatmapRoute['activity_type'];
  coords: LngLatPair[];
}

const decode = (routes: HeatmapRoute[]): HeatmapLine[] =>
  routes.map((r) => ({ id: r.id, type: r.activity_type, coords: decodePolyline(r.polyline) })).filter((l) => l.coords.length > 1);

/** Roams starting within this distance of the latest one are framed first. */
export const HEATMAP_FOCUS_M = 25_000;

/**
 * The routes to frame: those near where the latest Roam started. Framing all
 * of them would zoom out to fit a Roam in another city, and every route would
 * vanish at that scale; the rest stay a pinch away. Lines are newest first.
 */
export function focusLines(lines: HeatmapLine[]): HeatmapLine[] {
  const anchor = lines[0]?.coords[0];
  if (!anchor) return lines;
  return lines.filter((l) => haversine(anchor[1], anchor[0], l.coords[0][1], l.coords[0][0]) <= HEATMAP_FOCUS_M);
}

/** Every Roam's route for the heatmap: the cached copy first (works offline), refreshed on focus. */
export function useRoamHeatmap(userId: string | undefined) {
  const [lines, setLines] = useState<HeatmapLine[] | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let live = true;
      const key = cacheKeys.roamHeatmap(userId);
      void (async () => {
        const cached = await cacheGetStale<HeatmapRoute[]>(key).catch(() => null);
        if (live && cached) setLines(decode(cached));
        try {
          const { routes } = await getActivityHeatmap();
          await cacheSet(key, routes, cacheTTL.DAY).catch(() => undefined);
          if (live) setLines(decode(routes));
        } catch {
          if (live && !cached) setFailed(true);
        }
      })();
      return () => {
        live = false;
      };
    }, [userId]),
  );

  return { lines, failed };
}
