import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDefaultWorkoutPlans, type WorkoutPlanWithDays } from '@/src/lib/api/workoutPlans';
import { listRoutines, type Routine } from '@/src/lib/api/routines';
import { getSessionsHistory, type HistorySession } from '@/src/lib/api/workoutSessions';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

interface Resource<T> {
  data: T | null;
  loading: boolean;
  /** True when the last refresh failed and `data` is the cached copy (or null). */
  failed: boolean;
  refresh: () => Promise<void>;
  setData: (next: T) => void;
}

/**
 * Cached data for a Workouts screen: shows the last saved copy at once (also
 * offline — cache TTL is freshness, not lifetime), then refetches and saves.
 * Refetches whenever the screen comes back into focus.
 */
export function useCachedResource<T>(key: string | null, fetcher: () => Promise<T>, ttl: number): Resource<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    cacheGetStale<T>(key).then((cached) => {
      if (alive && cached != null) setDataState((prev) => prev ?? cached);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const fresh = await fetcherRef.current();
      setDataState(fresh);
      setFailed(false);
      cacheSet(key, fresh, ttl).catch(() => undefined);
    } catch {
      // Offline or server error: keep showing the cached copy.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [key, ttl]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const setData = useCallback(
    (next: T) => {
      setDataState(next);
      if (key) cacheSet(key, next, ttl).catch(() => undefined);
    },
    [key, ttl],
  );

  return { data, loading: loading && data == null, failed, refresh, setData };
}

export function useRoutines() {
  const { user } = useAuth();
  return useCachedResource<Routine[]>(user ? cacheKeys.routines(user.id) : null, listRoutines, cacheTTL.LONG);
}

export function useWorkoutHistory(limit = 50) {
  const { user } = useAuth();
  return useCachedResource<HistorySession[]>(
    user ? cacheKeys.workoutHistory(user.id) : null,
    async () => (await getSessionsHistory(1, limit)).data ?? [],
    cacheTTL.MEDIUM,
  );
}

/** Ready-made programs (system plans with their days and exercises). */
export function usePrograms() {
  return useCachedResource<WorkoutPlanWithDays[]>(
    cacheKeys.programs,
    async () => ((await getDefaultWorkoutPlans()).data ?? []).filter((p) => p.days?.some((d) => d.exercises?.length)),
    cacheTTL.DAY,
  );
}
