import notifee, { EventType } from '@notifee/react-native';
import { pauseSession, resumeSession, finishSession, getActiveSession } from '@/src/lib/api/workoutSessions';

/**
 * Handles notification action presses when the app is backgrounded.
 * Since React context is unavailable, calls the API directly.
 * Must be registered at module level (outside any component).
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.ACTION_PRESS || !detail.pressAction) return;

  const actionId = detail.pressAction.id;

  try {
    const { session } = await getActiveSession();
    if (!session) return;

    switch (actionId) {
      case 'pause':
        // Guard: only pause if session is still in_progress (foreground handler may have already paused it)
        if (session.status === 'in_progress') {
          await pauseSession(session.id);
        }
        // Re-display notification in paused state
        const { updateTimer } = require('@/src/lib/workoutNotification');
        await updateTimer(session.total_duration_sec, true, session.started_at, session.last_resumed_at);
        break;

      case 'resume':
        // Guard: only resume if session is actually paused
        if (session.status === 'paused') {
          await resumeSession(session.id);
        }
        const wn = require('@/src/lib/workoutNotification');
        await wn.updateTimer(session.total_duration_sec, false, session.started_at, session.last_resumed_at);
        break;

      case 'finish':
        // Guard: only finish if session is active
        if (session.status === 'in_progress' || session.status === 'paused') {
          await finishSession(session.id);
        }
        const { dismiss } = require('@/src/lib/workoutNotification');
        await dismiss();
        break;
    }
  } catch (error) {
    console.error('Background notification action failed:', error);
  }
});

// Register the foreground service task (Android only)
notifee.registerForegroundService(() => {
  // Return a promise that resolves when the service should stop.
  // For workout timer, this stays alive until dismiss() is called.
  return new Promise(() => {
    // Service runs indefinitely until stopForegroundService() is called
  });
});
