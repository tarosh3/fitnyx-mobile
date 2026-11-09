import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useCachedResource } from '@/src/features/workouts/hooks';
import { retentionMetricsKey } from '@/src/hooks/queryKeys';
import {
  createProgram, getActiveProgram, getDayTargets, runCheckin,
  type CreateProgramInput, type DayTargets, type Program,
} from '@/src/lib/api/programs';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

/**
 * The active adaptive program: the saved copy at once (also offline), refreshed on
 * focus. When a finished week is waiting for its review, runs it once and reloads.
 */
export function useActiveProgram() {
  const { user } = useAuth();
  const res = useCachedResource<Program | null>(user ? cacheKeys.activeProgram(user.id) : null, getActiveProgram, cacheTTL.LONG);
  const checking = useRef(false);
  const { refresh } = res;
  const due = !!res.data?.checkin_due;
  useEffect(() => {
    if (!due || checking.current) return;
    checking.current = true;
    runCheckin()
      .then(() => refresh())
      .catch(() => undefined) // offline: the next visit tries again
      .finally(() => { checking.current = false; });
  }, [due, refresh]);
  return res;
}

/** Builds a program, makes it the active plan, and refreshes Home / Train. */
export function useBuildProgram() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const build = useCallback(async (input: CreateProgramInput) => {
    setBusy(true);
    try {
      const program = await createProgram(input);
      if (user) await cacheSet(cacheKeys.activeProgram(user.id), program, cacheTTL.LONG).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user?.id) });
      return program;
    } finally {
      setBusy(false);
    }
  }, [queryClient, user]);
  return { build, busy };
}

/**
 * Today's targets for a program day, saved for offline use. Asks only when the day
 * belongs to the active program on this phone: every other workout skips the call.
 */
export async function loadProgramTargets(userId: string, dayId: string): Promise<DayTargets | null> {
  const program = await cacheGetStale<Program | null>(cacheKeys.activeProgram(userId)).catch(() => null);
  if (!program?.days.some((d) => d.id === dayId)) return null;
  const key = cacheKeys.programTargets(userId, dayId);
  try {
    const t = await getDayTargets(dayId);
    await cacheSet(key, t, cacheTTL.DAY).catch(() => undefined);
    return t;
  } catch {
    return cacheGetStale<DayTargets>(key).catch(() => null);
  }
}

/** "Full Body A · Week 4": the logger's title for a day of the active program. */
export async function programDayLabel(userId: string, dayId: string): Promise<string | null> {
  const program = await cacheGetStale<Program | null>(cacheKeys.activeProgram(userId)).catch(() => null);
  const day = program?.days.find((d) => d.id === dayId);
  return day ? `${day.title} · Week ${program!.week}` : null;
}

/** A day's targets for the preview on the program screen. */
export function useDayTargets(dayId: string | null | undefined) {
  const { user } = useAuth();
  const [data, setData] = useState<DayTargets | null>(null);
  const [loading, setLoading] = useState(!!dayId);
  useEffect(() => {
    if (!user || !dayId) return;
    let alive = true;
    setData(null); // a new day (or program): never show the last one's targets meanwhile
    setLoading(true);
    loadProgramTargets(user.id, dayId)
      .then((t) => { if (alive) setData(t); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user, dayId]);
  return { data, loading };
}

/** The newest check-in (calendar week) the user has opened, to mark a new one. */
export function useCheckinSeen(programId: string | null | undefined) {
  const { user } = useAuth();
  const key = user && programId ? cacheKeys.programCheckinSeen(user.id, programId) : null;
  const [seen, setSeen] = useState<number | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    cacheGetStale<number>(key).then((v) => { if (alive) setSeen(v ?? -1); }).catch(() => { if (alive) setSeen(-1); });
    return () => { alive = false; };
  }, [key]);
  const markSeen = useCallback((week: number) => {
    setSeen(week);
    if (key) cacheSet(key, week, cacheTTL.DAY).catch(() => undefined);
  }, [key]);
  return { seen, markSeen };
}
