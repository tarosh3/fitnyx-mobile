import { useCallback, useEffect, useRef, useState } from 'react';

import { nextSkip, replaceItem } from '@/src/features/workouts/today/model';
import { getTodayWorkout, type TodayItem, type TodayWorkout } from '@/src/lib/api/todayWorkout';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheGet, cacheGetStale, cacheInvalidate, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

type Saved = { plan: TodayWorkout; skip: string[] };

/**
 * Today's workout. Kept for a while so coming back shows the same plan, with any swaps;
 * an older copy from today still shows when the network is gone.
 */
export function useTodayWorkout() {
  const { user } = useAuth();
  const key = user ? cacheKeys.todayWorkout(user.id, localDateKey(new Date())) : null;
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  const keep = useCallback((next: Saved) => {
    setSaved(next);
    if (key) cacheSet(key, next, cacheTTL.LONG).catch(() => undefined);
  }, [key]);

  const build = useCallback(async (skip: string[]): Promise<boolean> => {
    const id = ++latest.current;
    setLoading(true);
    setFailed(false);
    try {
      const plan = await getTodayWorkout(skip);
      if (id === latest.current) keep({ plan, skip: nextSkip(skip, plan) });
      return true;
    } catch {
      if (id === latest.current) setFailed(true);
      return false;
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [keep]);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    (async () => {
      const fresh = await cacheGet<Saved>(key);
      if (!alive) return;
      if (fresh) {
        setSaved(fresh);
        setLoading(false);
        return;
      }
      const stale = await cacheGetStale<Saved>(key);
      if (!alive) return;
      if (stale) setSaved(stale);
      await build([]);
    })();
    return () => { alive = false; };
  }, [key, build]);

  const plan = saved?.plan ?? null;
  return {
    plan,
    loading,
    failed,
    retry: () => build(saved?.skip ?? []),
    /** Another focus for today: skips what's showing, and what was skipped before. */
    somethingElse: () => build([...(saved?.skip ?? []), ...(plan?.parts ?? [])]),
    replace: (uuid: string, next: TodayItem) => {
      if (saved) keep({ ...saved, plan: replaceItem(saved.plan, uuid, next) });
    },
    /** Started: the next visit plans from what was just done. */
    clear: () => { if (key) cacheInvalidate(key).catch(() => undefined); },
  };
}
