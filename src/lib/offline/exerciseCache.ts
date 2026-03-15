import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheTTL } from '@/src/lib/cache/keys';
import { fetchExerciseByUUID } from '@/src/lib/api/exercises';
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
    return null;
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
