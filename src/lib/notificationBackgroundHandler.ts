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
        await pauseSession(session.id);
        // Re-display notification in paused state
        const { updateTimer } = require('@/src/lib/workoutNotification');
        await updateTimer(session.total_duration_sec, true);
        break;

      case 'resume':
        await resumeSession(session.id);
        const wn = require('@/src/lib/workoutNotification');
        await wn.updateTimer(session.total_duration_sec, false);
        break;

      case 'finish':
        await finishSession(session.id);
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
