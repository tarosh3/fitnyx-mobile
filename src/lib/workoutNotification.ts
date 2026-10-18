import notifee, { AndroidCategory, AndroidImportance, AndroidStyle, EventType, type Notification } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { cacheKeys } from '@/src/lib/cache/keys';
import { syncWorkoutLiveActivity } from '@/src/lib/workoutLiveActivity';
import { elapsedForSession, formatWorkoutElapsed, getWorkoutState, workoutActionLabel, type WorkoutNotificationState } from '@/src/lib/workoutNotificationState';
import { colors } from '@/src/theme/colors';

export const NOTIFICATION_ID = 'active-workout';
const CHANNEL_ID = 'workout-timer';
const ARTWORK = require('../../assets/images/workouts/training-hero.jpg');
const EQUIPMENT = require('../../assets/images/workouts/strength-equipment.png');
type Action = 'pause' | 'resume' | 'open';
type ActionCallback = (action: Action, sessionId: string, state?: WorkoutNotificationState) => void | Promise<void>;
let queue: Promise<void> = Promise.resolve();

export async function initialize(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({ id: CHANNEL_ID, name: 'Workout controls', importance: AndroidImportance.LOW, vibration: false, sound: '' });
  } else if (Platform.OS === 'ios') {
    const existing = await notifee.getNotificationCategories();
    await notifee.setNotificationCategories([
      ...existing.filter((category) => !category.id.startsWith('workout')),
      ...(['ready', 'running', 'paused'] as const).map((state) => ({
        id: `workout-${state}`,
        actions: [
          { id: state === 'running' ? 'pause' : 'resume', title: workoutActionLabel[state] },
          { id: 'open', title: 'Open workout', foreground: true },
        ],
      })),
    ]);
  }
}

export function buildWorkoutNotification(session: WorkoutSession): Notification {
  const state = getWorkoutState(session);
  const time = formatWorkoutElapsed(elapsedForSession(session));
  const title = state === 'ready' ? 'Ready when you are' : state === 'paused' ? 'Take a breath' : 'Make this session count';
  const body = state === 'ready' ? 'Your workout is ready. Tap Start to begin.'
    : state === 'paused' ? `${time} elapsed · Your timer is paused`
    : 'Training in progress · Your timer is running';
  return {
    id: NOTIFICATION_ID, title, body,
    data: { sessionId: session.id, workoutState: state },
    android: {
      channelId: CHANNEL_ID,
      // Keep this sticky: Notifee's shortService times out on Android 14+.
      category: AndroidCategory.SERVICE, ongoing: true, autoCancel: false, onlyAlertOnce: true,
      smallIcon: 'ic_stat_notification', color: colors.dark.primary, largeIcon: EQUIPMENT,
      showChronometer: state === 'running', chronometerDirection: 'up',
      timestamp: state === 'running' ? Date.now() - elapsedForSession(session) * 1000 : undefined,
      showTimestamp: state === 'running',
      style: { type: AndroidStyle.BIGPICTURE, picture: ARTWORK, largeIcon: null, title, summary: body },
      actions: [
        { title: workoutActionLabel[state], pressAction: { id: state === 'running' ? 'pause' : 'resume' } },
        { title: 'Open workout', pressAction: { id: 'open', launchActivity: 'default' } },
      ],
      pressAction: { id: 'open', launchActivity: 'default' },
    },
    ios: {
      categoryId: `workout-${state}`, interruptionLevel: 'passive',
      foregroundPresentationOptions: { alert: false, badge: false, sound: false, banner: false, list: true },
    },
  };
}

/** Serialize transitions so a slow artwork load cannot restore an older notification. */
export function showActiveWorkout(session: WorkoutSession): Promise<void> {
  queue = queue.then(async () => {
    if (Platform.OS === 'web') return;
    // The Live Activity is the iOS workout surface. Avoid a duplicate plain
    // notification below it; retain notification actions as an availability fallback.
    if (Platform.OS === 'ios' && await syncWorkoutLiveActivity(session)) {
      await notifee.cancelNotification(NOTIFICATION_ID);
      return;
    }
    try { await notifee.displayNotification(buildWorkoutNotification(session)); }
    catch (error) { console.warn('Workout notification unavailable', error); }

  }).catch((error) => { console.warn('Workout controls unavailable', error); });
  return queue;
}

export const updateTimer = showActiveWorkout;

export function dismiss(): Promise<void> {
  queue = queue.then(async () => {
    if (Platform.OS === 'web') return;
    try { await notifee.cancelNotification(NOTIFICATION_ID); }
    finally { await syncWorkoutLiveActivity(null); }
  }).catch((error) => { console.warn('Could not clear workout controls', error); });
  return queue;
}

export async function rememberOpenRequest(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(cacheKeys.workoutNotificationOpen, sessionId);
}

export async function consumeOpenRequest(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(cacheKeys.workoutNotificationOpen);
  if (stored) await AsyncStorage.removeItem(cacheKeys.workoutNotificationOpen);
  const initial = Platform.OS === 'android' ? await notifee.getInitialNotification() : null;
  return stored ?? (initial?.notification.id === NOTIFICATION_ID && typeof initial.notification.data?.sessionId === 'string'
    ? initial.notification.data.sessionId : null);
}

export function onAction(callback: ActionCallback): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (detail.notification?.id !== NOTIFICATION_ID) return;
    const id = detail.notification.data?.sessionId;
    if (typeof id !== 'string') return;
    const action = type === EventType.PRESS ? 'open' : type === EventType.ACTION_PRESS ? detail.pressAction?.id : undefined;
    if (action !== 'pause' && action !== 'resume' && action !== 'open') return;
    const state = detail.notification.data?.workoutState as WorkoutNotificationState | undefined;
    Promise.resolve(callback(action, id, state)).catch((error) => console.warn('Workout action failed', error));
  });
}
