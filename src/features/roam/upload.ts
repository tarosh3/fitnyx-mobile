import { isAuthError } from '@/src/lib/api';
import { createActivity, type ActivityDetail, type CreateActivityInput } from '@/src/lib/api/activities';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { addToOfflineQueue } from '@/src/lib/cache/indexeddb';
import { isTransientStatus } from '@/src/lib/offline/syncEngine';
import type { RoamPoint } from '@/src/features/roam/geo';
import type { RecordingMeta } from '@/src/features/roam/recordingStore';

// The backend rejects activities longer than 12 h (a forgotten recording).
const MAX_DURATION_MS = 12 * 60 * 60 * 1000 - 60 * 1000;

export type SaveOutcome =
  | { status: 'saved'; activity: ActivityDetail }
  | { status: 'queued' }
  | { status: 'too-short' };

/** Builds the upload payload; null when there isn't enough track to save. */
export function buildActivityInput(
  meta: RecordingMeta,
  points: RoamPoint[],
  nowMs = Date.now(),
): CreateActivityInput | null {
  const endedMs = Math.min(nowMs, meta.startedAtMs + MAX_DURATION_MS);
  const maxT = (endedMs - meta.startedAtMs) / 1000;
  const kept = points.filter((p) => p[2] <= maxT);
  if (kept.length < 2 || endedMs <= meta.startedAtMs) return null;
  return {
    client_activity_id: meta.clientId,
    activity_type: meta.type,
    started_at: new Date(meta.startedAtMs).toISOString(),
    ended_at: new Date(endedMs).toISOString(),
    local_date: localDateKey(new Date(meta.startedAtMs)),
    points: kept,
  };
}

/**
 * Uploads a finished Roam. Network failures and transient server errors are
 * queued for the offline sync (the upload is idempotent via client_activity_id);
 * a 4xx is thrown so the user can see it.
 */
export async function saveRoam(meta: RecordingMeta, points: RoamPoint[]): Promise<SaveOutcome> {
  const input = buildActivityInput(meta, points);
  if (!input) return { status: 'too-short' };
  try {
    return { status: 'saved', activity: await createActivity(input) };
  } catch (error) {
    if (isAuthError(error)) throw error;
    const status = (error as { status?: number }).status;
    if (status === undefined || isTransientStatus(status)) {
      await addToOfflineQueue({ type: 'SAVE_ACTIVITY', payload: input });
      return { status: 'queued' };
    }
    throw error;
  }
}
