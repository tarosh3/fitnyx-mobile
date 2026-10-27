import { isAuthError } from '@/src/lib/api';
import { createActivity, type ActivityDetail, type CreateActivityInput } from '@/src/lib/api/activities';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { addToOfflineQueue } from '@/src/lib/cache/indexeddb';
import { isTransientStatus } from '@/src/lib/offline/syncEngine';
import { readHealthHeartRate, syncRoamToHealth } from '@/src/lib/health';
import type { RoamPoint, VehicleWindow } from '@/src/features/roam/geo';
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
  name?: string,
  vehicleWindows: VehicleWindow[] = [],
): CreateActivityInput | null {
  // Finish pauses the recording, so pausedAtMs is when the Roam ended — time
  // spent on the review screen (or waiting to sync offline) doesn't count.
  const endedMs = Math.min(meta.pausedAtMs ?? nowMs, meta.startedAtMs + MAX_DURATION_MS);
  const maxT = (endedMs - meta.startedAtMs) / 1000;
  const kept = points.filter((p) => p[2] <= maxT);
  if (kept.length < 2 || endedMs <= meta.startedAtMs) return null;
  return {
    client_activity_id: meta.clientId,
    activity_type: meta.type,
    started_at: new Date(meta.startedAtMs).toISOString(),
    ended_at: new Date(endedMs).toISOString(),
    local_date: localDateKey(new Date(meta.startedAtMs)),
    ...(name ? { name } : {}),
    // The backend takes [lat, lng, t, acc, segment, speed, steps]; course and
    // altitude are for the on-device raw export only.
    points: kept.map(([lat, lng, t, acc, seg, speed, steps]): RoamPoint => [lat, lng, t, acc, seg, speed ?? -1, steps ?? -1]),
    ...(vehicleWindows.length ? { vehicle_windows: vehicleWindows.filter(([, b]) => b > 0).map(([a, b]): VehicleWindow => [Math.max(0, a), Math.min(b, maxT)]).filter(([a, b]) => b > a) } : {}),
  };
}

/**
 * Uploads a finished Roam. Network failures and transient server errors are
 * queued for the offline sync (the upload is idempotent via client_activity_id);
 * a 4xx is thrown so the user can see it.
 */
export async function saveRoam(
  meta: RecordingMeta,
  points: RoamPoint[],
  name?: string,
  vehicleWindows: VehicleWindow[] = [],
): Promise<SaveOutcome> {
  const input = buildActivityInput(meta, points, Date.now(), name, vehicleWindows);
  if (!input) return { status: 'too-short' };
  // Attach heart rate from the health store for the activity's window (no-op
  // unless the user enabled Health sync; null when nothing has synced yet).
  try {
    const hr = await readHealthHeartRate(new Date(input.started_at), new Date(input.ended_at));
    if (hr.avg != null) input.avg_hr = hr.avg;
    if (hr.max != null) input.max_hr = hr.max;
  } catch {
    /* best-effort */
  }
  try {
    const activity = await createActivity(input);
    syncRoamToHealth(activity).catch(() => undefined); // best-effort mirror to Apple Health / Health Connect
    return { status: 'saved', activity };
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
