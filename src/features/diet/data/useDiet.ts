import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDietPlan, type DietPlan } from '@/src/lib/api';
import { fetchDietLogs, fetchDietSummary, type CreateDietLogInput, type DietLog, type DietSummary } from '@/src/lib/api/diet';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { onOfflineSync } from '@/src/lib/offline/syncEngine';
import { mergeDayLogs, pendingDietChanges, pendingLog, removeMealLog, saveMealLog } from './dietLogs';

const isOffline = (error: unknown) => !(error as { status?: number })?.status;

export type PlanState = 'loading' | 'ready' | 'none' | 'offline';

/** The user's diet plan; 'none' sends them to plan setup, 'offline' when it couldn't be checked. */
export function useDietPlan(userId: string | undefined) {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [state, setState] = useState<PlanState>('loading');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getDietPlan(userId);
      setPlan(result?.id ? result : null);
      setState(result?.id ? 'ready' : 'none');
    } catch (error) {
      // Never offer "create a plan" to someone who may already have one.
      setState(isOffline(error) ? 'offline' : 'none');
    }
  }, [userId]);

  // On focus: a plan made on the setup screen is read back from the device cache.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const replace = useCallback((next: DietPlan) => { setPlan(next); setState('ready'); }, []);
  return { plan, state, reload: load, replace } as const;
}

/** One day's meal logs: cached first, refreshed on focus and after an offline sync, queued meals merged in. */
export function useDietDay(userId: string | undefined, date: string) {
  const [logs, setLogs] = useState<DietLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const id = ++request.current;
    const key = cacheKeys.dietLogs(userId, date);
    const cached = await cacheGetStale<DietLog[]>(key);
    if (id !== request.current) return;
    if (cached) {
      setLogs(mergeDayLogs(cached, await pendingDietChanges(), date));
      setLoaded(true);
    }
    try {
      const res = await fetchDietLogs(date);
      await cacheSet(key, res.logs, cacheTTL.DAY);
      const pending = await pendingDietChanges();
      if (id !== request.current) return;
      setLogs(mergeDayLogs(res.logs, pending, date));
      setOffline(false);
    } catch (error) {
      if (id !== request.current) return;
      if (isOffline(error)) {
        setOffline(true);
        if (!cached) setLogs(mergeDayLogs([], await pendingDietChanges(), date));
      }
    } finally {
      if (id === request.current) setLoaded(true);
    }
  }, [userId, date]);

  useEffect(() => { setLoaded(false); setLogs([]); }, [date]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => onOfflineSync(() => { refresh(); }), [refresh]);

  const add = useCallback(async (input: CreateDietLogInput) => {
    setLogs((prev) => [...prev, pendingLog(input)]);
    try {
      await saveMealLog(input);
    } catch (error) {
      setLogs((prev) => prev.filter((l) => l.client_log_id !== input.client_log_id));
      throw error;
    }
    refresh();
  }, [refresh]);

  const remove = useCallback(async (clientLogId: string) => {
    let removed: DietLog | undefined;
    setLogs((prev) => {
      removed = prev.find((l) => l.client_log_id === clientLogId);
      return prev.filter((l) => l.client_log_id !== clientLogId);
    });
    try {
      await removeMealLog(clientLogId);
    } catch (error) {
      if (removed) setLogs((prev) => [...prev, removed as DietLog]);
      throw error;
    }
    refresh();
  }, [refresh]);

  return { logs, loaded, offline, refresh, add, remove } as const;
}

/** Per-day totals for a date range (week strip, insights): cached first, refreshed on focus. */
export function useDietSummary(userId: string | undefined, from: string, to: string) {
  const [summary, setSummary] = useState<DietSummary | null>(null);
  const [offline, setOffline] = useState(false);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const id = ++request.current;
    const key = cacheKeys.dietSummary(userId, from, to);
    const cached = await cacheGetStale<DietSummary>(key);
    if (id !== request.current) return;
    if (cached) setSummary(cached);
    try {
      const res = await fetchDietSummary(from, to);
      await cacheSet(key, res, cacheTTL.DAY);
      if (id !== request.current) return;
      setSummary(res);
      setOffline(false);
    } catch (error) {
      if (id === request.current && isOffline(error)) setOffline(true);
    }
  }, [userId, from, to]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => onOfflineSync(() => { refresh(); }), [refresh]);

  return { summary, offline, refresh } as const;
}
