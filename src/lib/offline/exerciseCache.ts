import { idbGet, idbGetStale, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheTTL } from '@/src/lib/cache/keys';
import { fetchExerciseByUUID } from '@/src/lib/api/exercises';
import { getCatalog } from '@/src/lib/offline/catalogCache';
import { Exercise } from '@/src/types/exercise';

function exerciseCacheKey(uuid: string): string {
  return `exercise:${uuid}`;
}

export async function getCachedExercise(uuid: string): Promise<Exercise | null> {
  return idbGet<Exercise>(exerciseCacheKey(uuid));
}

export async function cacheExercise(uuid: string, exercise: Exercise): Promise<void> {
  await idbSet(exerciseCacheKey(uuid), exercise, cacheTTL.DAY);
}

export async function fetchExerciseWithCache(uuid: string): Promise<Exercise | null> {
  const cached = await getCachedExercise(uuid);
  if (cached) return cached;

  try {
    const exercise = await fetchExerciseByUUID(uuid);
    await cacheExercise(uuid, exercise);
    return exercise;
  } catch {
    // Offline: an older per-exercise copy beats a nameless screen; failing
    // that, the cached catalog's summary row (name, body part, equipment,
    // muscles — no how-to/video, which the detail screen degrades to a still
    // image and "no steps yet"). Better than a flat "couldn't load".
    const stale = await idbGetStale<Exercise>(exerciseCacheKey(uuid));
    if (stale) return stale;
    const catalog = await getCatalog().catch(() => null);
    return catalog?.find((e) => e.uuid === uuid) ?? null;
  }
}

export async function cacheExercisesForDay(exerciseUuids: string[]): Promise<void> {
  await Promise.all(
    exerciseUuids.map(async (uuid) => {
      const cached = await getCachedExercise(uuid);
      if (cached) return;
      try {
        const exercise = await fetchExerciseByUUID(uuid);
        await cacheExercise(uuid, exercise);
      } catch {
        // Skip if fetch fails
      }
    })
  );
}
