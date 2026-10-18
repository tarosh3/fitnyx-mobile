import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { decodePolyline } from '@/src/features/roam/geo';
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
