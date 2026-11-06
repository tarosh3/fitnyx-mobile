import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import { idbGetStale, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys, cacheTTL } from '@/src/lib/cache/keys';
import { resolveId } from '@/src/lib/offline/offlineStore';

/**
 * Today's workout once started. The server's session has no plan behind it, so its
 * targets live here, on this phone. One at a time: the server allows one open workout.
 */
export interface TodayRun {
  sessionId: string;
  title: string;
  items: WorkoutDayExercise[];
}

export const saveTodayRun = (run: TodayRun) => idbSet(cacheKeys.todayRun, run, cacheTTL.DAY);

/** The saved plan if it belongs to this session, also after an offline id was synced. */
export async function loadTodayRun(sessionId: string): Promise<TodayRun | null> {
  const run = await idbGetStale<TodayRun>(cacheKeys.todayRun);
  if (!run) return null;
  if (run.sessionId === sessionId) return run;
  const [a, b] = await Promise.all([resolveId(run.sessionId), resolveId(sessionId)]);
  return a === b ? run : null;
}
