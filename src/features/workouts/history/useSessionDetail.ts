import { useCallback, useEffect, useState } from 'react';

import { type SessionTotals, totals, trackingOf } from '@/src/features/workouts/model';
import type { ExerciseLog, WorkoutSession } from '@/src/lib/api/workoutSessions';
import { fetchExerciseWithCache } from '@/src/lib/offline/exerciseCache';
import { offlineGetSession } from '@/src/lib/offline/offlineApi';
import type { Exercise } from '@/src/types/exercise';

export interface ExerciseGroup {
  uuid: string;
  exercise: Exercise | null;
  logs: ExerciseLog[];
}

/** A workout with its sets grouped by exercise, in the order they were done. */
export function groupLogs(logs: ExerciseLog[], exercises: Record<string, Exercise | null>): ExerciseGroup[] {
  const sorted = [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.set_index - b.set_index);
  const out: ExerciseGroup[] = [];
  for (const l of sorted) {
    let g = out.find((x) => x.uuid === l.exercise_uuid);
    if (!g) { g = { uuid: l.exercise_uuid, exercise: exercises[l.exercise_uuid] ?? null, logs: [] }; out.push(g); }
    g.logs.push(l);
  }
  out.forEach((g) => g.logs.sort((a, b) => a.set_index - b.set_index));
  return out;
}

/** One finished (or open) workout for the summary and history detail screens. Works offline. */
export function useSessionDetail(sessionId: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [exercises, setExercises] = useState<Record<string, Exercise | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await offlineGetSession(sessionId);
      const list = res.exercise_logs ?? [];
      const uuids = Array.from(new Set(list.map((l) => l.exercise_uuid)));
      const found = await Promise.all(uuids.map((u) => fetchExerciseWithCache(u).catch(() => null)));
      setExercises(Object.fromEntries(uuids.map((u, i) => [u, found[i]])));
      setSession(res.session);
      setLogs(list);
    } catch (e: any) {
      setError(e?.message || 'Couldn’t load this workout.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const typeOf = (uuid: string) => trackingOf(exercises[uuid]);
  const sum: SessionTotals = totals(logs, typeOf);

  return { session, setSession, logs, setLogs, exercises, groups: groupLogs(logs, exercises), totals: sum, typeOf, loading, error, reload: load };
}
