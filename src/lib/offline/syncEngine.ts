import { saveMetric } from '@/src/lib/api';
import { createActivity } from '@/src/lib/api/activities';
import { createDietLog, deleteDietLog } from '@/src/lib/api/diet';
import { createCustomExercise } from '@/src/lib/api/exercises';
import { cacheExercise } from '@/src/lib/offline/exerciseCache';
import {
  logExerciseSet,
  updateExerciseLog,
  deleteExerciseLog,
  sessionAction,
} from '@/src/lib/api/workoutSessions';
import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  updateOfflineQueue,
  OfflineMutation,
} from '@/src/lib/cache/indexeddb';
import {
  clearPersistedSession,
  cleanupStaleSessions,
  deleteOfflineLog,
  isOfflineId,
  promoteOfflineLog,
  promoteOfflineSession,
  pruneIdMappings,
  resolveId,
} from './offlineStore';

export interface SyncResult {
  processed: number;
  failed: number;
  errors: Array<{ mutation: OfflineMutation; error: string }>;
}

const resolveSessionId = resolveId;

/**
 * Takes a synced mutation off the queue and returns the entry as it is now —
 * null if the user removed it meanwhile. Atomic, so an edit or delete made
 * while the request was in flight is never lost between the check and removal.
 */
async function takeFromQueue(id: string): Promise<OfflineMutation | null> {
  let current: OfflineMutation | null = null;
  await updateOfflineQueue((queue) => {
    current = queue.find((m) => m.id === id) ?? null;
    return queue.filter((m) => m.id !== id);
  });
  return current;
}

async function processMutation(mutation: OfflineMutation): Promise<void> {
  const { type, payload } = mutation;

  switch (type) {
    case 'UPDATE_STATS': {
      await saveMetric(payload);
      break;
    }

    case 'START_SESSION': {
      try {
        // Use the validated /action endpoint (checks plan ownership + deletion)
        const session = await sessionAction('start', {
          planId: payload.planId,
          dayId: payload.dayId,
          startedAt: payload.startedAt,
        });
        await promoteOfflineSession(payload.tempId, session.id);
      } catch (error: any) {
        // 409 = server already has an active session — map to existing session
        if (error?.status === 409 && error?.data?.session?.id) {
          await promoteOfflineSession(payload.tempId, error.data.session.id);
        } else {
          throw error;
        }
      }
      break;
    }

    case 'LOG_SET': {
      const realSessionId = await resolveSessionId(payload.sessionId);
      if (realSessionId.startsWith('offline-')) {
        throw new Error('Session not yet synced — will retry');
      }
      const log = await logExerciseSet(realSessionId, {
        exercise_uuid: payload.exerciseUuid,
        set_number: payload.setNumber,
        actual_reps: payload.reps,
        actual_weight_kg: payload.weightKg,
        actual_duration_sec: payload.durationSec,
        actual_distance_m: payload.distanceM,
        rpe: payload.rpe,
      });
      if (payload.logId && log?.id) await promoteOfflineLog(realSessionId, payload.logId, log.id);

      // The set may have been edited or deleted while this request was in
      // flight (offlineApi rewrites / removes the queued LOG_SET). Apply that
      // to the set the server just created.
      const now = await takeFromQueue(mutation.id);
      if (!log?.id) break;
      if (!now) {
        await deleteOfflineLog(realSessionId, log.id);
        await deleteExerciseLog(log.id).catch(() =>
          addToOfflineQueue({ type: 'DELETE_SET', payload: { sessionId: realSessionId, logId: log.id } }),
        );
      } else if (
        now.payload.reps !== payload.reps ||
        now.payload.weightKg !== payload.weightKg ||
        now.payload.durationSec !== payload.durationSec ||
        now.payload.distanceM !== payload.distanceM ||
        now.payload.rpe !== payload.rpe
      ) {
        // weight 0 = bodyweight (clears a weight that was set)
        const edit = {
          reps: now.payload.reps, weightKg: now.payload.weightKg ?? 0,
          durationSec: now.payload.durationSec, distanceM: now.payload.distanceM, rpe: now.payload.rpe,
        };
        await updateExerciseLog(log.id, {
          actual_reps: edit.reps,
          actual_weight_kg: edit.weightKg,
          actual_duration_sec: edit.durationSec,
          actual_distance_m: edit.distanceM,
          rpe: edit.rpe,
        }).catch(() =>
          addToOfflineQueue({ type: 'UPDATE_SET', payload: { sessionId: realSessionId, logId: log.id, ...edit } }),
        );
      }
      break;
    }

    case 'UPDATE_SET': {
      // A set created offline whose LOG_SET hasn't synced was edited in the
      // queue instead (offlineApi); one that has synced resolves to its server id.
      const logId = await resolveId(payload.logId);
      if (isOfflineId(logId)) break;
      await updateExerciseLog(logId, {
        actual_reps: payload.reps,
        actual_weight_kg: payload.weightKg,
        actual_duration_sec: payload.durationSec,
        actual_distance_m: payload.distanceM,
        rpe: payload.rpe,
      });
      break;
    }

    case 'DELETE_SET': {
      const logId = await resolveId(payload.logId);
      if (isOfflineId(logId)) break;
      await deleteExerciseLog(logId);
      break;
    }

    case 'PAUSE_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('pause', { sessionId: realId, timestamp: payload.timestamp });
      break;
    }

    case 'RESUME_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('resume', { sessionId: realId, timestamp: payload.timestamp });
      break;
    }

    case 'FINISH_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('finish', { sessionId: realId, timestamp: payload.timestamp });
      // Clean up offline data for this session
      await clearPersistedSession(realId);
      break;
    }

    case 'ABANDON_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('abandon', { sessionId: realId, timestamp: payload.timestamp });
      await clearPersistedSession(realId);
      break;
    }

    case 'SAVE_ACTIVITY': {
      // A Roam saved while offline. Idempotent server-side (client_activity_id).
      await createActivity(payload);
      break;
    }

    case 'LOG_MEAL': {
      // A diet log saved while offline. Idempotent server-side (client_log_id).
      await createDietLog(payload);
      break;
    }

    case 'CREATE_EXERCISE': {
      // A custom exercise made offline. Idempotent server-side (device-made uuid).
      const created = await createCustomExercise(payload);
      await cacheExercise(created.uuid, created);
      break;
    }

    case 'DELETE_MEAL_LOG': {
      try {
        await deleteDietLog(payload.clientLogId);
      } catch (error) {
        // Already gone (deleted on another device): nothing left to do.
        if ((error as { status?: number }).status !== 404) throw error;
      }
      break;
    }

    default:
      console.warn(`Unknown offline mutation type: ${type}`);
  }
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

let syncInProgress = false;
let rerunRequested = false;
const syncListeners = new Set<(result: SyncResult) => void>();

/** Called after a sync run that sent something, so screens can refetch. */
export function onOfflineSync(listener: (result: SyncResult) => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export async function processOfflineQueue(): Promise<SyncResult> {
  // Prevent concurrent sync runs (AuthProvider + SyncManager can both trigger).
  // A trigger that lands mid-run (a set logged while syncing) gets one more
  // pass afterwards instead of waiting for the next reconnect.
  if (syncInProgress) {
    rerunRequested = true;
    return { processed: 0, failed: 0, errors: [] };
  }
  syncInProgress = true;

  const total: SyncResult = { processed: 0, failed: 0, errors: [] };
  try {
    do {
      rerunRequested = false;
      const result = await processOfflineQueueInternal();
      total.processed += result.processed;
      total.failed = result.failed;
      total.errors = result.errors;
    } while (rerunRequested);
  } finally {
    syncInProgress = false;
  }
  if (total.processed > 0) syncListeners.forEach((listener) => listener(total));
  return total;
}

async function processOfflineQueueInternal(): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (!queue.length) return { processed: 0, failed: 0, errors: [] };

  // Sort by timestamp to process in order
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

  const result: SyncResult = { processed: 0, failed: 0, errors: [] };
  // Offline sessions whose START the server permanently rejected — their sets
  // and actions can never sync, so they're dropped instead of retried forever.
  const rejectedSessions = new Set<string>();
  // Custom exercises whose CREATE didn't reach the server this run. Their sets
  // wait (a set for an unknown exercise is a hard 400 and would be dropped).
  const waitingExercises = new Set<string>();
  const rejectedExercises = new Set<string>();

  for (const mutation of sorted) {
    if (mutation.payload?.sessionId && rejectedSessions.has(mutation.payload.sessionId)) {
      await removeFromOfflineQueue(mutation.id);
      result.failed++;
      result.errors.push({ mutation, error: 'Session start was rejected by the server' });
      continue;
    }
    const exerciseUuid = mutation.type === 'LOG_SET' ? mutation.payload?.exerciseUuid : undefined;
    if (exerciseUuid && rejectedExercises.has(exerciseUuid)) {
      await removeFromOfflineQueue(mutation.id);
      result.failed++;
      result.errors.push({ mutation, error: 'Custom exercise was rejected by the server' });
      continue;
    }
    if (exerciseUuid && waitingExercises.has(exerciseUuid)) {
      result.failed++;
      result.errors.push({ mutation, error: 'Exercise not yet synced — will retry' });
      continue;
    }
    try {
      await processMutation(mutation);
      await removeFromOfflineQueue(mutation.id);
      result.processed++;
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      const status = error?.status;

      // Keep in queue for retry if:
      // - Session not yet synced (dependency ordering)
      // - No HTTP status (network/transient error)
      // - Timeout, rate limit or server error — the mutation itself is fine.
      //   Replaying a whole offline workout can exceed the 60 req/min limit;
      //   dropping on 429 would silently lose sets.
      if (message.includes('not yet synced') || !status || isTransientStatus(status)) {
        if (mutation.type === 'CREATE_EXERCISE') waitingExercises.add(mutation.payload?.uuid);
        result.failed++;
        result.errors.push({ mutation, error: message });
        continue;
      }

      // Hard client rejection (other 4xx) — remove from queue, mutation is invalid
      console.warn(`Sync failed for ${mutation.type} (${status}):`, message);
      await removeFromOfflineQueue(mutation.id);
      if (mutation.type === 'START_SESSION' && mutation.payload?.tempId) {
        rejectedSessions.add(mutation.payload.tempId);
        await clearPersistedSession(mutation.payload.tempId);
      }
      if (mutation.type === 'CREATE_EXERCISE') rejectedExercises.add(mutation.payload?.uuid);
      result.failed++;
      result.errors.push({ mutation, error: message });
    }
  }

  // Forget offline→server id mappings nothing can reach any more. Kept while a
  // queued mutation or a stored session/set still uses them: a session screen
  // opened offline keeps its offline id after the session syncs.
  const remaining = await getOfflineQueue();
  const referenced = new Set<string>();
  for (const m of remaining) {
    for (const v of [m.payload?.sessionId, m.payload?.logId, m.payload?.tempId]) {
      if (typeof v === 'string') referenced.add(v);
    }
  }
  await pruneIdMappings(referenced).catch(() => {});

  // Clean up stale completed/abandoned sessions older than 7 days
  await cleanupStaleSessions().catch(() => {});

  return result;
}
