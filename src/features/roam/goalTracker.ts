import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { roamKcal } from '@/src/features/roam/calories';
import type { ActivityType, RoamStats } from '@/src/features/roam/geo';
import {
  addActivity, formatGoal, GOAL_META, goalValue, milestoneId, newMilestones, reachedMilestones,
  type ActivityGoal, type DayActivity, type GoalKind, type Milestone,
} from '@/src/features/goals/model';
import { colors } from '@/src/theme/colors';

// One per recording, next to the recording itself (fitnyx-roam:*).
const KEY = 'fitnyx-roam:goal-tracker';
const CHANNEL_ID = 'goals';

/** The day's goals and what was done before this Roam, fixed when it starts. */
export interface GoalTracker {
  clientId: string;
  type: ActivityType;
  goals: ActivityGoal[];
  before: DayActivity;
  weightKg: number | null;
  /** milestoneId()s already announced (or reached before this Roam). */
  announced: string[];
}

export async function startGoalTracker(t: Omit<GoalTracker, 'announced'>): Promise<void> {
  // Goals the day had already reached aren't announced again.
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...t, announced: reachedMilestones(t.goals, t.before) }));
}

export async function getGoalTracker(clientId: string | undefined): Promise<GoalTracker | null> {
  if (!clientId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const t = raw ? (JSON.parse(raw) as GoalTracker) : null;
    return t?.clientId === clientId ? t : null;
  } catch {
    return null;
  }
}

/** This Roam so far, in goal terms. */
export function roamActivity(type: ActivityType, stats: RoamStats | null, weightKg: number | null): DayActivity {
  if (!stats) return { distanceM: 0, kcal: 0, steps: 0 };
  return { distanceM: stats.distanceM, kcal: roamKcal(type, stats.distanceM, stats.movingTimeSec, weightKg), steps: stats.steps ?? 0 };
}

export function milestoneMessage(kind: GoalKind, m: Milestone, target: number, value: number): { title: string; body: string } {
  const label = GOAL_META[kind].label.toLowerCase();
  if (m === 'done') return { title: `${GOAL_META[kind].label} goal reached`, body: `${formatGoal(kind, value)} today. Nice work!` };
  return { title: `Halfway to your ${label} goal`, body: `${formatGoal(kind, value)} of ${formatGoal(kind, target)} today. Keep going.` };
}

let queue: Promise<void> = Promise.resolve();

/**
 * Announces milestones the day reached with this Roam (a notification, which
 * also buzzes). Runs from the foreground and the background GPS task, so it is
 * serialized and remembers what it announced in storage.
 */
export function checkGoalMilestones(clientId: string, stats: RoamStats): Promise<void> {
  queue = queue.catch(() => undefined).then(async () => {
    const t = await getGoalTracker(clientId);
    if (!t || t.goals.length === 0) return;
    const day = addActivity(t.before, roamActivity(t.type, stats, t.weightKg));
    const fresh = newMilestones(t.goals, day, t.announced);
    if (!fresh.length) return;
    t.announced = [...t.announced, ...fresh.flatMap(({ kind, milestone }) =>
      milestone === 'done' ? [milestoneId(kind, 'half'), milestoneId(kind, 'done')] : [milestoneId(kind, 'half')])];
    await AsyncStorage.setItem(KEY, JSON.stringify(t));
    for (const { kind, milestone } of fresh) {
      const target = t.goals.find((g) => g.kind === kind)!.target;
      await notify(`roam-goal:${kind}`, milestoneMessage(kind, milestone, target, goalValue(kind, day)));
    }
  }).catch((error) => console.warn('Roam goal check failed', error));
  return queue;
}

async function notify(id: string, { title, body }: { title: string; body: string }): Promise<void> {
  if (Platform.OS === 'web') return;
  // Lazy: notifee's native module crashes jest for every screen importing this file.
  const { default: notifee, AndroidImportance } = require('@notifee/react-native') as typeof import('@notifee/react-native');
  if (Platform.OS === 'android') {
    await notifee.createChannel({ id: CHANNEL_ID, name: 'Goals', importance: AndroidImportance.HIGH, vibration: true, vibrationPattern: [200, 300] });
  }
  await notifee.displayNotification({
    id, title, body,
    android: {
      channelId: CHANNEL_ID, smallIcon: 'ic_stat_notification', color: colors.dark.primary,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    ios: { sound: 'default' },
  });
}
