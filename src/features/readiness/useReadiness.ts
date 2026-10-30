import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { cacheGet, cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { readReadinessSeries, type ReadinessDay } from '@/src/lib/health';
import { useAuth } from '@/src/providers/AuthProvider';
import { computeReadiness } from './readiness';

// 28-day baseline + a few days of buffer for missing nights.
const SERIES_DAYS = 35;

/**
 * The daily readiness score, computed on the device from the health store.
 * Reading the store is ~100 native queries, so it runs at most once per day:
 * the cached series hydrates instantly (even offline) and the store is only
 * re-read when that cache has expired (cacheTTL.DAY) or on an explicit refresh.
 */
export function useReadiness() {
  const { user } = useAuth();
  const key = user ? cacheKeys.readinessSeries(user.id) : null;
  const [series, setSeries] = useState<ReadinessDay[]>([]);
  const [loading, setLoading] = useState(true);

  const readStore = useCallback(async () => {
    if (!key) return;
    try {
      const next = await readReadinessSeries(SERIES_DAYS);
      setSeries(next);
      cacheSet(key, next, cacheTTL.DAY).catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  const load = useCallback(async () => {
    if (!key) {
      setLoading(false);
      return;
    }
    const stale = await cacheGetStale<ReadinessDay[]>(key);
    if (stale) {
      setSeries(stale);
      setLoading(false);
    }
    // Only hit the health store when the cached series has expired (~daily).
    const fresh = await cacheGet<ReadinessDay[]>(key);
    if (fresh) {
      setSeries(fresh);
      setLoading(false);
      return;
    }
    await readStore();
  }, [key, readStore]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const readiness = useMemo(() => computeReadiness(series), [series]);
  return { readiness, series, loading, refresh: readStore };
}
