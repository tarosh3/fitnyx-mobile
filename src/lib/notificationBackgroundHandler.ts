import notifee, { EventType } from '@notifee/react-native';
import { isAuthError } from '@/src/lib/api';
import { getActiveSession, type WorkoutSession } from '@/src/lib/api/workoutSessions';
import { offlinePauseSession, offlineResumeSession } from '@/src/lib/offline/offlineApi';
import { getActiveOfflineSessionId, getOfflineSession, isOfflineId, resolveId } from '@/src/lib/offline/offlineStore';
import { dismiss, NOTIFICATION_ID, rememberOpenRequest, showActiveWorkout } from '@/src/lib/workoutNotification';
import { getWorkoutState } from '@/src/lib/workoutNotificationState';

const pendingSessions = new Set<string>();
const isActive = (session: WorkoutSession | null | undefined): session is WorkoutSession =>
  !!session && (session.status === 'in_progress' || session.status === 'paused');

async function currentSession(): Promise<WorkoutSession | null> {
  try {
    const { active, session } = await getActiveSession();
    if (!active) {
      const localId = await getActiveOfflineSessionId();
      if (localId && isOfflineId(localId)) {
        const local = await getOfflineSession(localId);
        if (isActive(local)) return local;
      }
    }
    return active && isActive(session) ? session : null;
  } catch (error) {
    // HTTP/auth failures are authoritative failures, not permission to use a stale copy.
    if (isAuthError(error) || (error as { status?: number })?.status != null) throw error;
    const activeId = await getActiveOfflineSessionId();
    if (!activeId) return null;
    const session = await getOfflineSession(await resolveId(activeId));
    return isActive(session) ? session : null;
  }
}

/**
 * Registered at module scope so actions work without a mounted React provider.
 * The session and phase on the notification are a guard, never the source of truth.
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const notification = detail.notification;
  const sessionId = notification?.data?.sessionId;
  if (notification?.id !== NOTIFICATION_ID || typeof sessionId !== 'string' || !sessionId.trim()) return;

  try {
    const action = detail.pressAction?.id;
    if (type === EventType.PRESS || (type === EventType.ACTION_PRESS && action === 'open')) {
      // Navigation belongs to the foreground provider, which rechecks the session ID.
      await rememberOpenRequest(sessionId);
      return;
    }
    if (type !== EventType.ACTION_PRESS || (action !== 'pause' && action !== 'resume')) return;
    const phase = notification.data?.workoutState;
    if (action === 'pause' ? phase !== 'running' : phase !== 'paused' && phase !== 'ready') return;

    const targetId = await resolveId(sessionId);
    if (pendingSessions.has(targetId)) return;
    pendingSessions.add(targetId);
    try {
      const session = await currentSession();
      if (!session) {
        // An older notification must not dismiss a newer locally active workout.
        const activeId = await getActiveOfflineSessionId();
        if (!activeId || await resolveId(activeId) === targetId) await dismiss();
        return;
      }
      if (await resolveId(session.id) !== targetId) return;
      if (getWorkoutState(session) !== phase) {
        await showActiveWorkout(session);
        return;
      }
      const confirmed = action === 'pause'
        ? await offlinePauseSession(session.id)
        : await offlineResumeSession(session.id);
      await showActiveWorkout(confirmed);
    } finally {
      pendingSessions.delete(targetId);
    }
  } catch (error) {
    if (!isAuthError(error) && (error as { status?: number })?.status != null) {
      console.warn('Workout notification action failed:', error);
    }
  }
});
