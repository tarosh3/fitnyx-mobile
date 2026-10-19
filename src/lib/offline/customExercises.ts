import NetInfo from '@react-native-community/netinfo';

import { archiveCustomExercise, createCustomExercise, type CustomExerciseInput } from '@/src/lib/api/exercises';
import { addToOfflineQueue, getOfflineQueue } from '@/src/lib/cache/indexeddb';
import { cacheExercise } from '@/src/lib/offline/exerciseCache';
import type { Exercise } from '@/src/types/exercise';

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable === true);
}

/** The exercise the device shows until the server's copy arrives. */
export function localExercise(input: CustomExerciseInput): Exercise {
  const now = new Date().toISOString();
  return {
    id: 0,
    uuid: input.uuid,
    title: input.title.trim(),
    video_url: '',
    pro_tip: '',
    how_to: '',
    primary_muscles: input.primary_muscle ? [{ name: input.primary_muscle, image: '', description: '' }] : [],
    secondary_muscles: [],
    equipment: input.equipment ? [{ name: input.equipment, description: '' }] : [],
    variations: [],
    alternatives: [],
    page_url: '',
    created_at: now,
    updated_at: now,
    tracking_type: input.tracking_type,
    owner_id: 'me',
  };
}

/**
 * Creates the user's exercise online, or queues CREATE_EXERCISE (idempotent on
 * the device-made uuid) when offline. Either way it is cached so the logger and
 * history can show it, and sets can be logged against it right away: the queue
 * replays the create before them. HTTP errors (400 / 409 limit, duplicate name)
 * are thrown with `status`, `code` and the server's message.
 */
export async function offlineCreateExercise(input: CustomExerciseInput): Promise<Exercise> {
  if (await isOnline()) {
    try {
      const created = await createCustomExercise(input);
      await cacheExercise(created.uuid, created);
      return created;
    } catch (error) {
      if ((error as { status?: number }).status) throw error;
      // Network error: queue it below.
    }
  }
  const local = localExercise(input);
  await cacheExercise(input.uuid, local);
  await addToOfflineQueue({ type: 'CREATE_EXERCISE', payload: input });
  return local;
}

/** True while the exercise's create is still queued: its sets must queue too. */
export async function isExerciseQueued(uuid: string): Promise<boolean> {
  const queue = await getOfflineQueue();
  return queue.some((m) => m.type === 'CREATE_EXERCISE' && m.payload?.uuid === uuid);
}

/** Removes the user's exercise (online only; a still-queued create can't be removed yet). */
export async function removeCustomExercise(uuid: string): Promise<void> {
  if (await isExerciseQueued(uuid)) throw new Error('Not synced yet. Try again when you’re online.');
  try {
    await archiveCustomExercise(uuid);
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }
}
