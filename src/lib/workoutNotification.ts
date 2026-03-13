import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
  Event,
  AndroidAction,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'workout-timer';
const NOTIFICATION_ID = 'active-workout';

type NotificationActionCallback = (action: 'pause' | 'resume' | 'finish') => void;

let actionCallback: NotificationActionCallback | null = null;

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

export async function showActiveWorkout(elapsedSec: number, isPaused: boolean): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : undefined,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        category: AndroidCategory.SERVICE,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_launcher',
        showChronometer: !isPaused,
        chronometerDirection: 'up',
        timestamp: isPaused ? undefined : Date.now() - elapsedSec * 1000,
        showTimestamp: !isPaused,
        actions: buildActions(isPaused),
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } else if (Platform.OS === 'ios') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : `Elapsed: ${formatElapsed(elapsedSec)}`,
      ios: {
        categoryId: 'workout',
        interruptionLevel: 'active',
      },
    });
  }
}

export async function updateTimer(elapsedSec: number, isPaused: boolean): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : undefined,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        category: AndroidCategory.SERVICE,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_launcher',
        showChronometer: !isPaused,
        chronometerDirection: 'up',
        timestamp: isPaused ? undefined : Date.now() - elapsedSec * 1000,
        showTimestamp: !isPaused,
        actions: buildActions(isPaused),
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } else if (Platform.OS === 'ios') {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Workout in Progress',
      body: isPaused ? `Paused at ${formatElapsed(elapsedSec)}` : `Elapsed: ${formatElapsed(elapsedSec)}`,
      ios: {
        categoryId: 'workout',
        interruptionLevel: 'active',
      },
    });
  }
}

export async function dismiss(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.stopForegroundService();
  }
  await notifee.cancelNotification(NOTIFICATION_ID);
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
