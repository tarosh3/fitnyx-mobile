import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { activityFromProgress, withHealthToday } from '@/src/features/goals/model';
import { useCachedResource } from '@/src/features/workouts/hooks';
import { getGoals, updateGoals, type Goals, type GoalsUpdate } from '@/src/lib/api/goals';
import { fetchProgressDaily, type ProgressDaily } from '@/src/lib/api/progress';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { readHealthToday, type HealthToday } from '@/src/lib/health';
import { isDefinitelyOffline } from '@/src/lib/network';
import { useAuth } from '@/src/providers/AuthProvider';

/** GET /goals: last saved copy at once (also offline), refreshed on focus; save() needs a connection. */
export function useGoals() {
  const { user } = useAuth();
  const resource = useCachedResource<Goals>(user ? cacheKeys.goals(user.id) : null, getGoals, cacheTTL.LONG);
  const { setData } = resource;
  const save = useCallback(async (update: GoalsUpdate) => {
    if (await isDefinitelyOffline()) throw new Error('You’re offline. Goals save once you’re connected.');
    const next = await updateGoals(update);
    setData(next);
    return next;
  }, [setData]);
  return { ...resource, save };
}

/** A local date's distance, calories burned and steps (GET /progress/daily for that day). */
export function useDayActivity(date: string) {
  const { user } = useAuth();
  const resource = useCachedResource<ProgressDaily>(
    user ? cacheKeys.progressDaily(user.id, date, date) : null,
    () => fetchProgressDaily(date, date),
    cacheTTL.SHORT,
  );
  return { day: activityFromProgress(resource.data?.days.find((d) => d.date === date)), loaded: resource.data != null, refresh: resource.refresh };
}

/**
 * Today's activity toward the goals, with the health store's all-day steps and
 * active energy folded in when the user enabled Health sync (deduped via
 * withHealthToday). Falls back to the server numbers when Health is off.
 */
export function useTodayActivity() {
  const base = useDayActivity(localDateKey(new Date()));
  const [health, setHealth] = useState<HealthToday>({ steps: null, activeKcal: null });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      readHealthToday().then((h) => {
        if (alive) setHealth(h);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  return { ...base, day: withHealthToday(base.day, health) };
}
