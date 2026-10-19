import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { fetchMetricsHistory } from '@/src/lib/api';
import { getFitnessProfile, type FitnessProfile } from '@/src/lib/api/onboarding';
import {
  fetchProgressDaily,
  fetchProgressStrength,
  fetchProgressSummary,
  type ProgressDaily,
  type ProgressStrength,
  type ProgressSummary,
} from '@/src/lib/api/progress';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { previousRange, type DateRange } from './range';

export interface BodyMetric {
  id: string;
  weight_kg: number | null;
  height_cm: number | null;
  measurements?: Record<string, number> | null;
  recorded_at: string;
}

/**
 * Shows the last stored copy at once (also offline) and refreshes it from the
 * server: cacheGetStale → fetch → cacheSet, as the other tabs do.
 */
function useStored<T>(storeKey: string | null, fetcher: () => Promise<T>) {
  const [stored, setStored] = useState<{ key: string; value: T | null } | null>(null);
  useEffect(() => {
    if (!storeKey) return;
    let live = true;
    cacheGetStale<T>(storeKey)
      .then((value) => { if (live) setStored({ key: storeKey, value: value ?? null }); })
      .catch(() => { if (live) setStored({ key: storeKey, value: null }); });
    return () => { live = false; };
  }, [storeKey]);

  const query = useQuery({
    queryKey: ['progress', storeKey],
    queryFn: async () => {
      const value = await fetcher();
      if (storeKey) cacheSet(storeKey, value, cacheTTL.LONG).catch(() => undefined);
      return value;
    },
    enabled: !!storeKey,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const cached = stored?.key === storeKey ? stored.value : null;
  const data = query.data ?? cached ?? undefined;
  return {
    data,
    loading: !data && (query.isLoading || stored?.key !== storeKey),
    failed: !data && query.isError,
    refetch: query.refetch,
  };
}

/** Daily totals for the range and the equally long period before it, in one request. */
export function useProgressDaily(userId: string | undefined, r: DateRange) {
  const from = previousRange(r).from;
  return useStored<ProgressDaily>(userId ? cacheKeys.progressDaily(userId, from, r.to) : null, () => fetchProgressDaily(from, r.to));
}

export function useProgressStrength(userId: string | undefined, r: DateRange, enabled = true) {
  return useStored<ProgressStrength>(userId && enabled ? cacheKeys.progressStrength(userId, r.from, r.to) : null, () => fetchProgressStrength(r.from, r.to));
}

export function useProgressSummary(userId: string | undefined) {
  return useStored<ProgressSummary>(userId ? cacheKeys.progressSummary(userId) : null, fetchProgressSummary);
}

/** Shares the Body stats screen's caches, so both show the same entries offline. */
export function useBodyMetrics(userId: string | undefined, enabled = true) {
  // The Body stats screen stores the raw payload (an array, or { data: [] }).
  const history = useStored<unknown>(userId && enabled ? cacheKeys.bodyMetricsHistory(userId) : null, fetchMetricsHistory);
  const raw = history.data as { data?: unknown } | unknown[] | undefined;
  const list = (Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []) as BodyMetric[];
  const fitness = useStored<FitnessProfile>(userId && enabled ? cacheKeys.fitnessProfile(userId) : null, getFitnessProfile);
  return { history: list, loading: history.loading, targetKg: fitness.data?.target_weight_kg ?? null, fitness: fitness.data ?? null };
}
