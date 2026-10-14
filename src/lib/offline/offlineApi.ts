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
  localDateKey,
  SessionWithLogs,
} from '@/src/lib/api/workoutSessions';
import { addToOfflineQueue, updateOfflineQueue } from '@/src/lib/cache/indexeddb';
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
  resolveId,
  withPendingLogs,
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
    workout_date: localDateKey(new Date(now)),
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

export async function offlineGetSession(requestedId: string): Promise<SessionWithLogs> {
  // A session started offline that has since synced is fetched by its server id.
  const sessionId = await resolveId(requestedId);
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
      const exercise_logs = await withPendingLogs(sessionId, result.exercise_logs || []);
      // Persist for crash recovery
      await persistSessionState(result.session, result.exercise_logs || []);
      return { ...result, exercise_logs };
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

export async function offlineLogSet(requestedId: string, data: LogExerciseInput): Promise<ExerciseLog> {
  const sessionId = await resolveId(requestedId);
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
    duration_sec: data.actual_duration_sec,
    distance_m: data.actual_distance_m,
    rpe: data.rpe,
    is_warmup: false,
    created_at: now,
    _offline: true,
  };

  await addOfflineLog(sessionId, offlineLog);

  await addToOfflineQueue({
    type: 'LOG_SET',
    payload: {
      sessionId,
      logId,
      exerciseUuid: data.exercise_uuid,
      setNumber: data.set_number,
      reps: data.actual_reps,
      weightKg: data.actual_weight_kg,
      durationSec: data.actual_duration_sec,
      distanceM: data.actual_distance_m,
      rpe: data.rpe,
    },
  });

  return offlineLog;
}

// --- Update Log ---

export async function offlineUpdateLog(
  requestedSessionId: string,
  requestedLogId: string,
  data: { actual_reps?: number; actual_weight_kg?: number; actual_duration_sec?: number; actual_distance_m?: number; rpe?: number }
): Promise<ExerciseLog> {
  // A set logged offline that has since synced is edited by its server id.
  const sessionId = await resolveId(requestedSessionId);
  const logId = await resolveId(requestedLogId);
  const online = await checkOnline();

  if (online && !isOfflineId(logId)) {
    try {
      return await updateExerciseLog(logId, data);
    } catch (error: any) {
      if (error?.status) throw error;
    }
  }

  // Offline update. Only provided fields are written; weight 0 = bodyweight
  // (stored as no weight, matching the server).
  const updates: Partial<OfflineExerciseLog> = {};
  if (data.actual_reps !== undefined) updates.reps = data.actual_reps;
  if (data.actual_weight_kg !== undefined) {
    updates.weight_kg = data.actual_weight_kg === 0 ? undefined : data.actual_weight_kg;
  }
  if (data.actual_duration_sec !== undefined) updates.duration_sec = data.actual_duration_sec;
  if (data.actual_distance_m !== undefined) updates.distance_m = data.actual_distance_m;
  if (data.rpe !== undefined) updates.rpe = data.rpe;
  const updated =
    (await updateOfflineLog(sessionId, logId, updates)) ??
    (await updateOfflineLog(requestedSessionId, requestedLogId, updates));

  if (!updated) throw new Error('Log not found in offline store');

  if (isOfflineId(logId)) {
    // For offline-created logs, update the original LOG_SET in the queue
    // so sync creates the set with final values instead of original ones
    await updateQueuedLogSet([sessionId, requestedSessionId], logId, updated);
  } else {
    await addToOfflineQueue({
      type: 'UPDATE_SET',
      payload: {
        sessionId, logId, reps: data.actual_reps, weightKg: data.actual_weight_kg,
        durationSec: data.actual_duration_sec, distanceM: data.actual_distance_m, rpe: data.rpe,
      },
    });
  }

  return updated;
}

// --- Delete Log ---

export async function offlineDeleteLog(requestedSessionId: string, requestedLogId: string): Promise<void> {
  const sessionId = await resolveId(requestedSessionId);
  const logId = await resolveId(requestedLogId);
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
    const logs = [...(await getOfflineLogs(sessionId)), ...(await getOfflineLogs(requestedSessionId))];
    const deletedLog = logs.find((l) => l.id === logId);

    await deleteOfflineLog(sessionId, logId);
    await deleteOfflineLog(requestedSessionId, logId);

    // Remove the pending LOG_SET from the queue so it doesn't create a ghost set on sync
    if (deletedLog) {
      await removeQueuedLogSet([sessionId, requestedSessionId], logId, deletedLog);
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

// Matches the queued LOG_SET for an offline-created set: by its log id, or —
// for entries queued before LOG_SET carried one — by session, exercise and set
// number. sessionIds holds both the offline and (once synced) server id.
const isQueuedLogSet = (
  item: { type: string; payload: any },
  sessionIds: string[],
  logId: string,
  log: Pick<OfflineExerciseLog, 'exercise_uuid' | 'set_index'>,
) =>
  item.type === 'LOG_SET' &&
  (item.payload.logId
    ? item.payload.logId === logId
    : sessionIds.includes(item.payload.sessionId) &&
      item.payload.exerciseUuid === log.exercise_uuid &&
      item.payload.setNumber === log.set_index);

async function updateQueuedLogSet(
  sessionIds: string[],
  logId: string,
  log: OfflineExerciseLog
): Promise<void> {
  // Rewrite the first matching LOG_SET with the edited values (under the queue lock).
  await updateOfflineQueue((queue) => {
    const idx = queue.findIndex((q) => isQueuedLogSet(q, sessionIds, logId, log));
    if (idx === -1) return queue;
    const next = [...queue];
    next[idx] = {
      ...queue[idx],
      payload: {
        ...queue[idx].payload, reps: log.reps, weightKg: log.weight_kg,
        durationSec: log.duration_sec, distanceM: log.distance_m, rpe: log.rpe,
      },
    };
    return next;
  });
}

async function removeQueuedLogSet(
  sessionIds: string[],
  logId: string,
  log: OfflineExerciseLog
): Promise<void> {
  await updateOfflineQueue((queue) => {
    const idx = queue.findIndex((q) => isQueuedLogSet(q, sessionIds, logId, log));
    return idx === -1 ? queue : queue.filter((_, i) => i !== idx);
  });
}

// --- Session Actions (pause/resume/finish/abandon) ---

async function offlineSessionAction(
  actionType: 'pause' | 'resume' | 'finish' | 'abandon',
  requestedId: string,
  /** When the action actually happened (ISO). Defaults to now. */
  at?: string
): Promise<WorkoutSession | null> {
  const sessionId = await resolveId(requestedId);
  const online = await checkOnline();

  if (online && !isOfflineId(sessionId)) {
    try {
      const result = await sessionAction(actionType, { sessionId, timestamp: at });
      // Sync local offline state so stale sessions don't resurrect
      if (actionType === 'finish' || actionType === 'abandon') {
        await setActiveOfflineSessionId(null);
        // Update local copy to terminal status so offline fallback won't revive it
        const localSession = await getOfflineSession(sessionId);
        if (localSession) {
          localSession.status = actionType === 'finish' ? 'completed' : 'abandoned';
          localSession.finished_at = at ?? new Date().toISOString();
          await saveOfflineSession(localSession);
        }
      } else if (actionType === 'pause' || actionType === 'resume') {
        // Update local copy to match server state
        const localSession = await getOfflineSession(sessionId);
        if (localSession) {
          // Keep the confirmed accumulated time too: a later offline resume
          // must not restart from the pre-pause duration.
          await saveOfflineSession({ ...localSession, ...result });
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
          if (resp.active && resp.session?.id === sessionId) {
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
      payload: { sessionId, timestamp: at ?? new Date().toISOString() },
    });
    if (actionType === 'finish' || actionType === 'abandon') {
      await setActiveOfflineSessionId(null);
    }
    return null;
  }

  const now = at ?? new Date().toISOString();
  const nowMs = new Date(now).getTime();

  switch (actionType) {
    case 'pause': {
      if (session.status === 'paused') return session;
      const lastResumed = new Date(session.last_resumed_at || session.started_at).getTime();
      const additionalSec = Math.max(0, Math.floor((nowMs - lastResumed) / 1000));
      session.status = 'paused';
      session.paused_at = now;
      session.total_duration_sec += additionalSec;
      break;
    }
    case 'resume':
      if (session.status === 'in_progress') return session;
      session.status = 'in_progress';
      session.last_resumed_at = now;
      session.paused_at = undefined;
      break;
    case 'finish': {
      if (session.status !== 'paused') {
        const lastResumed = new Date(session.last_resumed_at || session.started_at).getTime();
        const additionalSec = Math.floor((nowMs - lastResumed) / 1000);
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
        const additionalSec = Math.floor((nowMs - lastResumed) / 1000);
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

export async function offlineFinishSession(sessionId: string, finishedAt?: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('finish', sessionId, finishedAt);
  if (!result) throw new Error('Failed to finish session');
  return result;
}

export async function offlineAbandonSession(sessionId: string): Promise<WorkoutSession> {
  const result = await offlineSessionAction('abandon', sessionId);
  if (!result) throw new Error('Failed to abandon session');
  return result;
}
