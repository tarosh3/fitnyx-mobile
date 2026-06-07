import NetInfo from '@react-native-community/netinfo';
import {
  logExerciseSet,
  updateExerciseLog,
  deleteExerciseLog,
  sessionAction,
  WorkoutSession,
  ExerciseLog,
  LogExerciseInput,
  StartSessionInput,
  getWorkoutSession,
  SessionWithLogs,
} from '@/src/lib/api/workoutSessions';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue, idbSet } from '@/src/lib/cache/indexeddb';
import {
  generateOfflineId,
  isOfflineId,
  saveOfflineSession,
  getOfflineSession,
  getOfflineLogs,
  addOfflineLog,
  updateOfflineLog,
  deleteOfflineLog,
  setActiveOfflineSessionId,
  persistSessionState,
  OfflineSession,
  OfflineExerciseLog,
} from './offlineStore';
import { canStartSession, canAddSet } from './offlineLimits';

async function checkOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  // Require isInternetReachable to be explicitly true — treat null (unknown) as offline
  // to avoid hanging API calls when connected to wifi without internet
  return Boolean(state.isConnected && state.isInternetReachable === true);
}

// --- Start Session ---

export async function offlineStartSession(input: StartSessionInput): Promise<WorkoutSession> {
  const online = await checkOnline();

  if (online) {
    try {
      // Use the validated /action endpoint (checks plan ownership + deletion)
      const session = await sessionAction('start', {
        planId: input.workout_plan_id,
        dayId: input.workout_day_id,
        startedAt: input.started_at,
      });
      await setActiveOfflineSessionId(session.id);
      await saveOfflineSession(session);
      return session;
    } catch (error: any) {
      // If 409 (already active), rethrow so caller can handle redirect
      if (error?.status === 409) throw error;
      // If network failed mid-request, fall through to offline
      if (!error?.status) {
        // Network error — create offline
      } else {
        throw error;
      }
    }
  }

  // Offline: create local session
  const check = await canStartSession();
  if (!check.allowed) {
    throw new Error(check.reason || 'Cannot start session offline.');
  }

  const tempId = generateOfflineId();
  const now = new Date().toISOString();

  const offlineSession: OfflineSession = {
    id: tempId,
    user_id: '',
    plan_id: input.workout_plan_id,
    day_id: input.workout_day_id,
    workout_date: now.split('T')[0],
    started_at: now,
    status: 'in_progress',
    total_duration_sec: 0,
    last_resumed_at: now,
    created_at: now,
    _offline: true,
  };

  await saveOfflineSession(offlineSession);
  await setActiveOfflineSessionId(tempId);

  await addToOfflineQueue({
    type: 'START_SESSION',
    payload: { tempId, planId: input.workout_plan_id, dayId: input.workout_day_id, startedAt: now },
  });

  return offlineSession;
}

// --- Get Session (with offline fallback) ---

export async function offlineGetSession(sessionId: string): Promise<SessionWithLogs> {
  if (isOfflineId(sessionId)) {
    const session = await getOfflineSession(sessionId);
    if (!session) throw new Error('Offline session not found');
    const logs = await getOfflineLogs(sessionId);
    return { session, exercise_logs: logs };
  }

  const online = await checkOnline();
  if (online) {
    try {
      const result = await getWorkoutSession(sessionId);
      // Persist for crash recovery
      await persistSessionState(result.session, result.exercise_logs || []);
      return result;
    } catch (error: any) {
      if (error?.status) throw error;
      // Network error, try offline store
    }
  }

  // Fallback to offline store
  const session = await getOfflineSession(sessionId);
  if (!session) throw new Error('Session not available offline');
  const logs = await getOfflineLogs(sessionId);
  return { session, exercise_logs: logs };
}

// --- Log Set ---

export async function offlineLogSet(sessionId: string, data: LogExerciseInput): Promise<ExerciseLog> {
  const online = await checkOnline();

  if (online && !isOfflineId(sessionId)) {
    try {
      const log = await logExerciseSet(sessionId, data);
      return log;
    } catch (error: any) {
      if (error?.status) throw error;
      // Network error, fall through to offline
    }
  }

  // Offline: create local log
  const setCheck = canAddSet(data.set_number - 1);
  if (!setCheck.allowed) {
    throw new Error(setCheck.reason || 'Cannot add more sets.');
  }

  const logId = generateOfflineId();
  const now = new Date().toISOString();

  const offlineLog: OfflineExerciseLog = {
    id: logId,
    session_id: sessionId,
    user_id: '',
    exercise_uuid: data.exercise_uuid,
    set_index: data.set_number,
    reps: data.actual_reps,
    weight_kg: data.actual_weight_kg,
    rpe: data.rpe,
    is_warmup: false,
    created_at: now,
    _offline: true,
  };

  await addOfflineLog(sessionId, offlineLog);

  await addToOfflineQueue({
    type: 'LOG_SET',
    payload: { sessionId, exerciseUuid: data.exercise_uuid, setNumber: data.set_number, reps: data.actual_reps, weightKg: data.actual_weight_kg, rpe: data.rpe },
  });

  return offlineLog;
}

// --- Update Log ---

export async function offlineUpdateLog(
  sessionId: string,
  logId: string,
  data: { actual_reps?: number; actual_weight_kg?: number }
): Promise<ExerciseLog> {
  const online = await checkOnline();

  if (online && !isOfflineId(logId)) {
    try {
      return await updateExerciseLog(logId, data);
    } catch (error: any) {
      if (error?.status) throw error;
    }
  }

  // Offline update
  const updated = await updateOfflineLog(sessionId, logId, {
    reps: data.actual_reps,
    weight_kg: data.actual_weight_kg,
  });

  if (!updated) throw new Error('Log not found in offline store');

  if (isOfflineId(logId)) {
    // For offline-created logs, update the original LOG_SET in the queue
    // so sync creates the set with final values instead of original ones
    await updateQueuedLogSet(sessionId, updated);
  } else {
    await addToOfflineQueue({
      type: 'UPDATE_SET',
      payload: { sessionId, logId, reps: data.actual_reps, weightKg: data.actual_weight_kg },
    });
  }

  return updated;
}

// --- Delete Log ---

export async function offlineDeleteLog(sessionId: string, logId: string): Promise<void> {
  const online = await checkOnline();

  if (online && !isOfflineId(logId)) {
    try {
      await deleteExerciseLog(logId);
      await deleteOfflineLog(sessionId, logId);
      return;
    } catch (error: any) {
      if (error?.status) throw error;
    }
  }

  if (isOfflineId(logId)) {
    // Capture the log data BEFORE deleting so we can find the matching queue entry
    const logs = await getOfflineLogs(sessionId);
    const deletedLog = logs.find((l) => l.id === logId);

    await deleteOfflineLog(sessionId, logId);

    // Remove the pending LOG_SET from the queue so it doesn't create a ghost set on sync
    if (deletedLog) {
      await removeQueuedLogSetByData(sessionId, deletedLog.exercise_uuid, deletedLog.set_index);
    }
  } else {
    await deleteOfflineLog(sessionId, logId);
    await addToOfflineQueue({
      type: 'DELETE_SET',
      payload: { sessionId, logId },
    });
  }
}

// --- Queue helpers for offline-created logs ---

async function updateQueuedLogSet(
  sessionId: string,
  log: OfflineExerciseLog
): Promise<void> {
  const queue = await getOfflineQueue();
  for (const item of queue) {
    if (
      item.type === 'LOG_SET' &&
      item.payload.sessionId === sessionId &&
      item.payload.exerciseUuid === log.exercise_uuid &&
      item.payload.setNumber === log.set_index
    ) {
      // Update the payload in-place with the new values
      item.payload.reps = log.reps;
      item.payload.weightKg = log.weight_kg;
      // Rewrite the queue with updated item
      const updated = queue.map((q) => (q.id === item.id ? item : q));
      await idbSet('offline-mutation-queue', updated, 7 * 24 * 60 * 60 * 1000);
      return;
    }
  }
}

async function removeQueuedLogSetByData(
  sessionId: string,
  exerciseUuid: string,
  setNumber: number
): Promise<void> {
  const queue = await getOfflineQueue();
  for (const item of queue) {
    if (
      item.type === 'LOG_SET' &&
      item.payload.sessionId === sessionId &&
      item.payload.exerciseUuid === exerciseUuid &&
      item.payload.setNumber === setNumber
    ) {
      await removeFromOfflineQueue(item.id);
      return;
    }
  }
}

// --- Session Actions (pause/resume/finish/abandon) ---

async function offlineSessionAction(
  actionType: 'pause' | 'resume' | 'finish' | 'abandon',
  sessionId: string
): Promise<WorkoutSession | null> {
  const online = await checkOnline();

  if (online && !isOfflineId(sessionId)) {
    try {
      const result = await sessionAction(actionType, { sessionId });
      // Sync local offline state so stale sessions don't resurrect
      if (actionType === 'finish' || actionType === 'abandon') {
        await setActiveOfflineSessionId(null);
        // Update local copy to terminal status so offline fallback won't revive it
        const localSession = await getOfflineSession(sessionId);
        if (localSession) {
          localSession.status = actionType === 'finish' ? 'completed' : 'abandoned';
          localSession.finished_at = new Date().toISOString();
          await saveOfflineSession(localSession);
        }
      } else if (actionType === 'pause' || actionType === 'resume') {
        // Update local copy to match server state
        const localSession = await getOfflineSession(sessionId);
        if (localSession) {
          if (actionType === 'pause') {
            localSession.status = 'paused';
            localSession.paused_at = new Date().toISOString();
          } else {
            localSession.status = 'in_progress';
            localSession.last_resumed_at = new Date().toISOString();
            localSession.paused_at = undefined;
          }
          await saveOfflineSession(localSession);
        }
      }
      return result;
    } catch (error: any) {
      // For pause/resume, a 400 means the session is already in the target state
      // (e.g. foreground handler already paused it). Treat as success by fetching current state.
      if (error?.status === 400 && (actionType === 'pause' || actionType === 'resume')) {
        try {
          const { getActiveSession } = require('@/src/lib/api/workoutSessions');
          const resp = await getActiveSession();
          if (resp.active && resp.session) {
            // Sync local copy with server state
            const localSession = await getOfflineSession(sessionId);
            if (localSession) {
              localSession.status = resp.session.status;
              localSession.paused_at = resp.session.paused_at;
              localSession.last_resumed_at = resp.session.last_resumed_at;
              localSession.total_duration_sec = resp.session.total_duration_sec;
              await saveOfflineSession(localSession);
            }
            return resp.session;
          }
        } catch {
          // If fetching active session also fails, fall through to offline
        }
      }
      if (error?.status) throw error;
    }
  }

  // Offline: update local session state
  const session = await getOfflineSession(sessionId);
  if (!session) {
    // Session was never persisted locally (e.g., started online but never loaded offline)
    // We can't update its state locally, but we can still queue the mutation for sync
    await addToOfflineQueue({
      type: `${actionType.toUpperCase()}_SESSION` as any,
      payload: { sessionId, timestamp: new Date().toISOString() },
    });
    if (actionType === 'finish' || actionType === 'abandon') {
      await setActiveOfflineSessionId(null);
    }
    return null;
  }

  const now = new Date().toISOString();

  switch (actionType) {
    case 'pause': {
      const lastResumed = new Date(session.last_resumed_at || session.started_at).getTime();
      const additionalSec = Math.floor((Date.now() - lastResumed) / 1000);
      session.status = 'paused';
      session.paused_at = now;
      session.total_duration_sec += additionalSec;
      break;
    }
    case 'resume':
      session.status = 'in_progress';
      session.last_resumed_at = now;
      session.paused_at = undefined;
      break;
    case 'finish': {
      if (session.status !== 'paused') {
        const lastResumed = new Date(session.last_resumed_at || session.started_at).getTime();
        const additionalSec = Math.floor((Date.now() - lastResumed) / 1000);
        session.total_duration_sec += additionalSec;
      }
      session.status = 'completed';
      session.finished_at = now;
      session.completed_at = now;
      break;
    }
    case 'abandon': {
      if (session.status !== 'paused') {
        const lastResumed = new Date(session.last_resumed_at || session.started_at).getTime();
        const additionalSec = Math.floor((Date.now() - lastResumed) / 1000);
        session.total_duration_sec += additionalSec;
      }
      session.status = 'abandoned';
      session.finished_at = now;
      break;
    }
  }

  await saveOfflineSession(session);

  if (actionType === 'finish' || actionType === 'abandon') {
    await setActiveOfflineSessionId(null);
  }

  await addToOfflineQueue({
    type: `${actionType.toUpperCase()}_SESSION` as any,
    payload: { sessionId, timestamp: now },
  });

  return session;
}

export async function offlinePauseSession(sessionId: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('pause', sessionId);
  if (!result) throw new Error('Failed to pause session');
  return result;
}

export async function offlineResumeSession(sessionId: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('resume', sessionId);
  if (!result) throw new Error('Failed to resume session');
  return result;
}

export async function offlineFinishSession(sessionId: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('finish', sessionId);
  if (!result) throw new Error('Failed to finish session');
  return result;
}

export async function offlineAbandonSession(sessionId: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('abandon', sessionId);
  if (!result) throw new Error('Failed to abandon session');
  return result;
}
