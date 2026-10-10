import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
  Event,
  AndroidAction,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';

const APP_ICON = require('../../assets/images/icon.png');
const BRAND_GREEN = '#3BD4A2';

const CHANNEL_ID = 'workout-timer';
const NOTIFICATION_ID = 'active-workout';

type NotificationActionCallback = (action: 'pause' | 'resume' | 'finish') => void;

let actionCallback: NotificationActionCallback | null = null;

// Track the Live Activity ID for updates / stop
let liveActivityId: string | undefined;

export async function initialize(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Workout Timer',
      importance: AndroidImportance.LOW,
      vibration: false,
      sound: '',
    });
  }
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildActions(isPaused: boolean): AndroidAction[] {
  return [
    {
      title: isPaused ? '▶ Resume' : '⏸ Pause',
      pressAction: { id: isPaused ? 'resume' : 'pause' },
    },
    {
      title: '✓ Finish',
      pressAction: { id: 'finish' },
    },
  ];
}

/**
 * Calculates the epoch-ms start date for the elapsed timer.
 * If paused, returns undefined (we stop the Live Activity timer).
 */
function computeTimerStartDate(
  elapsedSec: number,
  isPaused: boolean,
  sessionStartedAt?: string,
  lastResumedAt?: string,
): number | undefined {
  if (isPaused) return undefined;

  // Use last_resumed_at or started_at to calculate proper start
  if (lastResumedAt || sessionStartedAt) {
    const resumePoint = new Date(lastResumedAt || sessionStartedAt!).getTime();
    // startDate = resume point minus already-accumulated base time
    // This ensures the elapsed timer shows: base + (now - resumePoint)
    return resumePoint - (elapsedSec * 1000 - (Date.now() - resumePoint));
  }

  // Fallback: derive from current elapsed
  return Date.now() - elapsedSec * 1000;
}

export async function showActiveWorkout(
  elapsedSec: number,
  isPaused: boolean,
  sessionStartedAt?: string,
  lastResumedAt?: string,
): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : undefined,
      android: {
        channelId: CHANNEL_ID,
        // Plain sticky notification — NOT a foreground service. Notifee's
        // foreground service is declared shortService, which Android 14+
        // kills after ~3 minutes and crashes the app mid-workout.
        category: AndroidCategory.SERVICE,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_notification',
        color: BRAND_GREEN,
        colorized: true,
        largeIcon: APP_ICON,
        showChronometer: !isPaused,
        chronometerDirection: 'up',
        timestamp: isPaused ? undefined : Date.now() - elapsedSec * 1000,
        showTimestamp: !isPaused,
        actions: buildActions(isPaused),
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } else if (Platform.OS === 'ios') {
    // Silent notification for notification center
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : `Elapsed: ${formatElapsed(elapsedSec)}`,
      ios: {
        categoryId: 'workout',
        interruptionLevel: 'passive',
      },
    });

    // Start or update Live Activity for Dynamic Island
    try {
      const startDate = computeTimerStartDate(elapsedSec, isPaused, sessionStartedAt, lastResumedAt);

      const state: LiveActivity.LiveActivityState = {
        title: 'Workout in Progress',
        subtitle: isPaused ? `Paused · ${formatElapsed(elapsedSec)}` : undefined,
        progressBar: isPaused
          ? { progress: 0 }
          : {
              elapsedTimer: { startDate: startDate! },
            },
        imageName: 'workout_icon',
        dynamicIslandImageName: 'workout_icon',
      };

      const config: LiveActivity.LiveActivityConfig = {
        backgroundColor: '#0A0A0A',
        titleColor: '#FFFFFF',
        subtitleColor: '#9CA3AF',
        progressViewTint: BRAND_GREEN,
        progressViewLabelColor: '#FFFFFF',
        deepLinkUrl: '/active-workout',
        timerType: 'circular',
      };

      if (liveActivityId) {
        // Update existing Live Activity
        LiveActivity.updateActivity(liveActivityId, state);
      } else {
        // Start new Live Activity
        liveActivityId = LiveActivity.startActivity(state, config) as string | undefined;
      }
    } catch (error) {
      console.warn('Live Activity error:', error);
    }
  }
}

export async function updateTimer(
  elapsedSec: number,
  isPaused: boolean,
  sessionStartedAt?: string,
  lastResumedAt?: string,
): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : undefined,
      android: {
        channelId: CHANNEL_ID,
        // Plain sticky notification — see showActiveWorkout for why no foreground service.
        category: AndroidCategory.SERVICE,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_notification',
        color: BRAND_GREEN,
        colorized: true,
        largeIcon: APP_ICON,
        showChronometer: !isPaused,
        chronometerDirection: 'up',
        timestamp: isPaused ? undefined : Date.now() - elapsedSec * 1000,
        showTimestamp: !isPaused,
        actions: buildActions(isPaused),
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } else if (Platform.OS === 'ios') {
    // Silent notification update
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : `Elapsed: ${formatElapsed(elapsedSec)}`,
      ios: {
        categoryId: 'workout',
        interruptionLevel: 'passive',
      },
    });

    // Update Live Activity
    if (liveActivityId) {
      try {
        const startDate = computeTimerStartDate(elapsedSec, isPaused, sessionStartedAt, lastResumedAt);

        const state: LiveActivity.LiveActivityState = {
          title: 'Workout in Progress',
          subtitle: isPaused ? `Paused · ${formatElapsed(elapsedSec)}` : undefined,
          progressBar: isPaused
            ? { progress: 0 }
            : {
                elapsedTimer: { startDate: startDate! },
              },
          imageName: 'workout_icon',
          dynamicIslandImageName: 'workout_icon',
        };

        LiveActivity.updateActivity(liveActivityId, state);
      } catch (error) {
        console.warn('Live Activity update error:', error);
      }
    }
  }
}

export async function dismiss(): Promise<void> {
  await notifee.cancelNotification(NOTIFICATION_ID);

  // Stop Live Activity on iOS
  if (liveActivityId) {
    try {
      LiveActivity.stopActivity(liveActivityId, {
        title: 'Workout Complete',
        progressBar: { progress: 1.0 },
        imageName: 'workout_icon',
        dynamicIslandImageName: 'workout_icon',
      });
    } catch (error) {
      console.warn('Live Activity stop error:', error);
    }
    liveActivityId = undefined;
  }
}

export function onAction(callback: NotificationActionCallback): () => void {
  actionCallback = callback;

  const unsubscribe = notifee.onForegroundEvent(({ type, detail }: Event) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction) {
      const actionId = detail.pressAction.id;
      if (actionId === 'pause' || actionId === 'resume' || actionId === 'finish') {
        callback(actionId);
      }
    }
  });

  return () => {
    actionCallback = null;
    unsubscribe();
  };
}

export function getActionCallback(): NotificationActionCallback | null {
  return actionCallback;
}
