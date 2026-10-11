import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { isAuthError } from '@/src/lib/api';
import { listActivities, type ActivityListResponse } from '@/src/lib/api/activities';
import { cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';

/** Roam history + this week's totals: cached first, refreshed on every focus. */
export function useRoamActivities(userId: string | undefined) {
  const [data, setData] = useState<ActivityListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false); // nothing to load without a signed-in user
      return;
    }
    const key = cacheKeys.roamActivities(userId);
    const cached = await cacheGet<ActivityListResponse>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    try {
      const fresh = await listActivities();
      setData(fresh);
      setError(null);
      await cacheSet(key, fresh, cacheTTL.LONG);
    } catch (e) {
      if (isAuthError(e)) return;
      if (!cached) setError('Could not load your Roams.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { data, loading, error, refresh };
}
