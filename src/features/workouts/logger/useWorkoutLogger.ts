import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type DraftSet, draftToLog, trackingOf } from '@/src/features/workouts/model';
import { type Block, defaultSetsFor, nextSetNumber, pendingRows } from '@/src/features/workouts/logger/rows';
import { moveItem } from '@/src/features/workouts/ui/dragOrder';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { fetchExerciseHistory, type ExerciseHistory } from '@/src/lib/api/exercises';
import { getDayExercises, type WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import type { ExerciseLog, WorkoutSession } from '@/src/lib/api/workoutSessions';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys, cacheTTL } from '@/src/lib/cache/keys';
import { getCachedDayExercises } from '@/src/lib/db';
import { cacheExercisesForDay, fetchExerciseWithCache } from '@/src/lib/offline/exerciseCache';
import { offlineDeleteLog, offlineGetSession, offlineLogSet, offlineUpdateLog } from '@/src/lib/offline/offlineApi';
import { getIdMapping, isOfflineId } from '@/src/lib/offline/offlineStore';
import { cacheWorkoutVideos } from '@/src/lib/offline/videoCache';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import type { Exercise } from '@/src/types/exercise';

export interface LoggedResult {
  log: ExerciseLog;
  pr: boolean;
  restSec: number | null;
}

/** Top set of the most recent day and the all-time best, from the history endpoint (cached). */
async function lastAndBest(uuid: string): Promise<{ last: Partial<DraftSet> | null; bestKg: number | null }> {
  const key = cacheKeys.exerciseHistory(uuid);
  let hist = await idbGet<ExerciseHistory>(key);
  if (!hist) {
    hist = await fetchExerciseHistory(uuid);
    idbSet(key, hist, cacheTTL.MEDIUM).catch(() => undefined);
  }
  const day = hist?.days?.[hist.days.length - 1];
  let last: Partial<DraftSet> | null = null;
  if (day?.sets?.length) {
    const top = [...day.sets].sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0) || (b.duration_sec ?? 0) - (a.duration_sec ?? 0) || b.reps - a.reps)[0];
    last = { reps: top.reps, weightKg: top.weight_kg ?? 0, durationSec: top.duration_sec ?? 0, distanceM: top.distance_m ?? 0 };
  }
  return { last, bestKg: hist?.summary?.best_weight_kg ?? null };
}

function newBlock(uuid: string, planned: WorkoutDayExercise | null, exercise: Exercise | null, logs: ExerciseLog[], order: number): Block {
  return {
    key: `${uuid}-${order}`, uuid, planned, exercise, logs: [...logs].sort((a, b) => a.set_index - b.set_index),
    extraRows: planned ? 0 : logs.length ? 0 : defaultSetsFor(exercise), drafts: {}, last: null, bestKg: null,
  };
}

/**
 * State and actions for one live workout. Sets go through the offline layer
 * (queued when there's no signal), so every action works offline.
 */
export function useWorkoutLogger(sessionId: string) {
  const router = useRouter();
  const { activeSession, setActiveSession } = useWorkout();
  const { isOffline } = useOfflineAware();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const enrich = useCallback((uuid: string) => {
    lastAndBest(uuid)
      .then(({ last, bestKg }) => setBlocks((prev) => prev.map((b) => (b.uuid === uuid ? { ...b, last, bestKg } : b))))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await offlineGetSession(sessionId);
      setSession(res.session);
      if (['in_progress', 'paused'].includes(res.session.status)) setActiveSession(res.session);
      const byExercise = new Map<string, ExerciseLog[]>();
      (res.exercise_logs ?? []).forEach((l) => byExercise.set(l.exercise_uuid, [...(byExercise.get(l.exercise_uuid) ?? []), l]));

      let planned: WorkoutDayExercise[] = [];
      if (res.session.day_id) {
        try {
          planned = (await getDayExercises(res.session.day_id)).data ?? [];
        } catch {
          planned = (await getCachedDayExercises(res.session.day_id)) ?? [];
        }
      }
      const plannedIds = new Set(planned.map((p) => p.exercise_uuid));
      const adHoc = Array.from(byExercise.keys()).filter((u) => !plannedIds.has(u));
      const next = await Promise.all([
        ...planned.map(async (p, i) => newBlock(p.exercise_uuid, p, p.exercise ?? (await fetchExerciseWithCache(p.exercise_uuid).catch(() => null)), byExercise.get(p.exercise_uuid) ?? [], i)),
        ...adHoc.map(async (u, i) => newBlock(u, null, await fetchExerciseWithCache(u).catch(() => null), byExercise.get(u) ?? [], planned.length + i)),
      ]);
      setBlocks(next);
      next.forEach((b) => enrich(b.uuid));
      if (!isOffline && planned.length) {
        cacheExercisesForDay(planned.map((p) => p.exercise_uuid)).catch(() => undefined);
        const videos = next.map((b) => b.exercise?.video_url).filter((u): u is string => !!u && u.endsWith('.mp4'));
        if (videos.length) cacheWorkoutVideos(videos).catch(() => undefined);
      }
    } catch (e: any) {
      setError(e?.message || 'Couldn’t load this workout.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, isOffline, enrich, setActiveSession]);

  useEffect(() => { load(); }, [sessionId]);

  // Pause / resume / finish can also come from the notification (WorkoutProvider):
  // keep this screen's copy of the session in step.
  useEffect(() => {
    if (activeSession && activeSession.id === sessionId) setSession(activeSession);
  }, [activeSession, sessionId]);

  // Started offline and since synced: follow the server id.
  useEffect(() => {
    const liveId = activeSession?.id;
    if (!sessionId || !isOfflineId(sessionId) || !liveId || isOfflineId(liveId)) return;
    getIdMapping(sessionId).then((real) => { if (real === liveId) router.setParams({ id: real }); }).catch(() => undefined);
  }, [activeSession?.id, sessionId]);

  const patch = (bi: number, fn: (b: Block) => Block) => setBlocks((prev) => prev.map((b, i) => (i === bi ? fn(b) : b)));

  const logPending = async (bi: number, pi: number): Promise<LoggedResult | null> => {
    const b = blocksRef.current[bi];
    if (!b) return null;
    const row = pendingRows(b)[pi];
    const t = trackingOf(b.exercise);
    const created = await offlineLogSet(sessionId, { exercise_uuid: b.uuid, set_number: nextSetNumber(b.logs), ...draftToLog(t, row) });
    patch(bi, (x) => {
      // Later drafts shift up one row; this row's draft is used up.
      const drafts: Record<number, typeof row> = {};
      Object.entries(x.drafts).forEach(([k, v]) => { const n = Number(k); if (n > pi) drafts[n - 1] = v; else if (n < pi) drafts[n] = v; });
      const bestKg = created.is_pr && created.weight_kg ? Math.max(x.bestKg ?? 0, created.weight_kg) : x.bestKg;
      return { ...x, logs: [...x.logs, created], drafts, bestKg, extraRows: x.planned ? x.extraRows : Math.max(0, x.extraRows - 1) };
    });
    const restSec = t === 'cardio' ? null : b.planned?.rest_seconds && b.planned.rest_seconds > 0 ? b.planned.rest_seconds : 90;
    return { log: created, pr: !!created.is_pr, restSec };
  };

  const setDraft = (bi: number, pi: number, d: DraftSet) => patch(bi, (b) => ({ ...b, drafts: { ...b.drafts, [pi]: d } }));

  const updateLog = async (bi: number, logId: string, d: DraftSet, rpe?: number | null) => {
    const t = trackingOf(blocksRef.current[bi]?.exercise);
    const f = draftToLog(t, d);
    const updated = await offlineUpdateLog(sessionId, logId, {
      actual_reps: f.actual_reps,
      actual_weight_kg: 'actual_weight_kg' in f ? f.actual_weight_kg ?? 0 : undefined,
      actual_duration_sec: 'actual_duration_sec' in f ? f.actual_duration_sec : undefined,
      actual_distance_m: 'actual_distance_m' in f ? f.actual_distance_m : undefined,
      rpe: rpe ?? undefined,
    });
    patch(bi, (b) => ({ ...b, logs: b.logs.map((l) => (l.id === logId ? { ...l, ...updated } : l)) }));
  };

  const deleteLog = async (bi: number, logId: string) => {
    await offlineDeleteLog(sessionId, logId);
    patch(bi, (b) => ({ ...b, logs: b.logs.filter((l) => l.id !== logId) }));
  };

  const addSet = (bi: number) => patch(bi, (b) => ({ ...b, extraRows: b.extraRows + 1 }));
  const removePending = (bi: number) => patch(bi, (b) => ({ ...b, extraRows: b.extraRows - 1 }));

  const addExercises = (list: Exercise[]) =>
    setBlocks((prev) => [...prev, ...list.filter((e) => !prev.some((b) => b.uuid === e.uuid)).map((e, i) => {
      enrich(e.uuid);
      return newBlock(e.uuid, null, e, [], prev.length + i);
    })]);

  const removeBlock = (bi: number) => setBlocks((prev) => prev.filter((_, i) => i !== bi));
  const moveBlock = (from: number, to: number) => setBlocks((prev) => moveItem(prev, from, to));
  const swapBlock = (bi: number, e: Exercise) => {
    patch(bi, (b) => ({ ...newBlock(e.uuid, null, e, [], bi), key: `${e.uuid}-swap-${b.key}` }));
    enrich(e.uuid);
  };

  return {
    session, setSession, blocks, loading, error, reload: load,
    logPending, setDraft, updateLog, deleteLog, addSet, removePending, addExercises, removeBlock, moveBlock, swapBlock,
  };
}
