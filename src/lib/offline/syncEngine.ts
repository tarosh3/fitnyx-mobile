import { saveMetric } from '@/src/lib/api';
import {
  startWorkoutSession,
  logExerciseSet,
  updateExerciseLog,
  deleteExerciseLog,
} from '@/src/lib/api/workoutSessions';
import { sessionAction } from '@/src/lib/api/workoutSessions';
import { getOfflineQueue, removeFromOfflineQueue, OfflineMutation } from '@/src/lib/cache/indexeddb';
import { setIdMapping, getIdMapping, clearIdMappings, clearPersistedSession, cleanupStaleSessions } from './offlineStore';

export interface SyncResult {
  processed: number;
  failed: number;
  errors: Array<{ mutation: OfflineMutation; error: string }>;
}

async function resolveSessionId(sessionId: string): Promise<string> {
  if (!sessionId.startsWith('offline-')) return sessionId;
  const realId = await getIdMapping(sessionId);
  return realId || sessionId;
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
        const session = await startWorkoutSession({
          workout_plan_id: payload.planId,
          workout_day_id: payload.dayId,
        });
        await setIdMapping(payload.tempId, session.id);
      } catch (error: any) {
        // 409 = server already has an active session — map to existing session
        if (error?.status === 409 && error?.data?.session_id) {
          await setIdMapping(payload.tempId, error.data.session_id);
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
      await logExerciseSet(realSessionId, {
        exercise_uuid: payload.exerciseUuid,
        set_number: payload.setNumber,
        actual_reps: payload.reps,
        actual_weight_kg: payload.weightKg,
      });
      break;
    }

    case 'UPDATE_SET': {
      // If the log was created offline, we can't update it by its offline ID
      // It was already created during LOG_SET sync with correct data
      if (payload.logId?.startsWith('offline-')) break;
      await updateExerciseLog(payload.logId, {
        actual_reps: payload.reps,
        actual_weight_kg: payload.weightKg,
      });
      break;
    }

    case 'DELETE_SET': {
      if (payload.logId?.startsWith('offline-')) break;
      await deleteExerciseLog(payload.logId);
      break;
    }

    case 'PAUSE_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('pause', { sessionId: realId });
      break;
    }

    case 'RESUME_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('resume', { sessionId: realId });
      break;
    }

    case 'FINISH_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('finish', { sessionId: realId });
      // Clean up offline data for this session
      await clearPersistedSession(payload.sessionId);
      break;
    }

    case 'ABANDON_SESSION': {
      const realId = await resolveSessionId(payload.sessionId);
      if (realId.startsWith('offline-')) throw new Error('Session not yet synced');
      await sessionAction('abandon', { sessionId: realId });
      await clearPersistedSession(payload.sessionId);
      break;
    }

    default:
      console.warn(`Unknown offline mutation type: ${type}`);
  }
}

let syncInProgress = false;

export async function processOfflineQueue(): Promise<SyncResult> {
  // Prevent concurrent sync runs (AuthProvider + SyncManager can both trigger)
  if (syncInProgress) return { processed: 0, failed: 0, errors: [] };
  syncInProgress = true;

  try {
    return await processOfflineQueueInternal();
  } finally {
    syncInProgress = false;
  }
}

async function processOfflineQueueInternal(): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (!queue.length) return { processed: 0, failed: 0, errors: [] };

  // Sort by timestamp to process in order
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

  const result: SyncResult = { processed: 0, failed: 0, errors: [] };

  for (const mutation of sorted) {
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
      if (message.includes('not yet synced') || !status) {
        result.failed++;
        result.errors.push({ mutation, error: message });
        continue;
      }

      // Hard server rejection (4xx) — remove from queue, mutation is invalid
      console.error(`Sync failed for ${mutation.type} (${status}):`, message);
      await removeFromOfflineQueue(mutation.id);
      result.failed++;
      result.errors.push({ mutation, error: message });
    }
  }

  // If all processed successfully, clean up ID mappings
  const remaining = await getOfflineQueue();
  if (remaining.length === 0) {
    await clearIdMappings();
  }

  // Clean up stale completed/abandoned sessions older than 7 days
  await cleanupStaleSessions().catch(() => {});

  return result;
}
