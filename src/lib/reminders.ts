// Local reminders: workout / water / food / snack / custom.
// Persisted to AsyncStorage. Scheduled via notifee.
//
// Schedule kinds:
//  - daily   : fires once per day at hour:minute (notifee DAILY repeat)
//  - times   : array of HH:MM (one daily-repeat per entry)
//  - interval: every N minutes between startHour and endHour. We schedule
//              the next 24h of one-shot triggers (capped at MAX_INTERVAL_SLOTS)
//              and rebuild on app open / reminder edit.

import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { pickReminderCopy } from '@/src/lib/reminderMessages';

const BRAND_COLOR = '#5fc793';

export type ReminderType = 'workout' | 'water' | 'food' | 'snack' | 'custom';

export type ReminderSchedule =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'times'; times: string[] } // ["08:00","13:00"]
  | { kind: 'interval'; minutes: number; startHour: number; endHour: number };

export interface Reminder {
  id: string;
  type: ReminderType;
  label: string;
  message?: string;
  enabled: boolean;
  schedule: ReminderSchedule;
  createdAt: string;
}

const STORAGE_KEY = 'fitnyx:reminders:v1';
const CHANNEL_ID = 'fitnyx-reminders';
const MAX_INTERVAL_SLOTS = 30;

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const status = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any
      );
      if (status !== PermissionsAndroid.RESULTS.GRANTED) return false;
    } catch {
      // ignore, fall through to notifee
    }
  }
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function hasPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });
  }
}

export async function listReminders(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

async function saveAll(items: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function upsertReminder(
  input: Omit<Reminder, 'id' | 'createdAt'> & { id?: string }
): Promise<Reminder> {
  const items = await listReminders();
  const now = new Date().toISOString();
  let next: Reminder;
  if (input.id) {
    const idx = items.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      next = { ...items[idx], ...input } as Reminder;
      items[idx] = next;
    } else {
      next = { ...input, id: input.id, createdAt: now } as Reminder;
      items.push(next);
    }
  } else {
    next = { ...input, id: uid(), createdAt: now } as Reminder;
    items.push(next);
  }
  await saveAll(items);
  await cancelReminderTriggers(next.id);
  if (next.enabled) await scheduleReminder(next, { prompt: true });
  return next;
}

export async function deleteReminder(id: string): Promise<void> {
  const items = await listReminders();
  const filtered = items.filter((r) => r.id !== id);
  await saveAll(filtered);
  await cancelReminderTriggers(id);
}

export async function setReminderEnabled(id: string, enabled: boolean): Promise<void> {
  const items = await listReminders();
  const idx = items.findIndex((r) => r.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], enabled };
  await saveAll(items);
  await cancelReminderTriggers(id);
  if (enabled) await scheduleReminder(items[idx], { prompt: true });
}

function notifBody(r: Reminder): { title: string; body: string } {
  // If the user wrote a custom message, honor it fully (title = label, body = message).
  // Otherwise rotate BOTH title and body from the per-type catalog so each notification
  // feels fresh and funny. The label is used only for organizing reminders in-app.
  if (r.message && r.message.trim()) {
    return {
      title: r.label?.trim() || pickReminderCopy(r.type).title,
      body: r.message,
    };
  }
  const copy = pickReminderCopy(r.type);
  return { title: copy.title, body: copy.body };
}

function buildTimestampTrigger(timestamp: number, repeat?: RepeatFrequency): TimestampTrigger {
  return {
    type: TriggerType.TIMESTAMP,
    timestamp,
    ...(repeat !== undefined ? { repeatFrequency: repeat } : {}),
    // Use exact-and-allow-while-idle when the device grants exact alarms;
    // USE_EXACT_ALARM is auto-granted on Android 13+, SCHEDULE_EXACT_ALARM
    // is declared for Android 12 as a fallback (user must grant in settings).
    alarmManager:
      Platform.OS === 'android'
        ? { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE }
        : undefined,
  };
}

function nextOccurrence(hour: number, minute: number, from = new Date()): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

async function scheduleSingle(
  parentId: string,
  childKey: string,
  trigger: TimestampTrigger,
  payload: { title: string; body: string }
): Promise<void> {
  await notifee.createTriggerNotification(
    {
      id: `${parentId}:${childKey}`,
      title: payload.title,
      body: payload.body,
      data: { reminderId: parentId },
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_notification',
        // Native drawable name (installed via withNotifIcon plugin → res/drawable/notif_large.png)
        largeIcon: 'notif_large',
        color: BRAND_COLOR,
        colorized: true,
        // Tapping the notification re-opens the app's main activity.
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      ios: {
        sound: 'default',
      },
    },
    trigger
  );
}

export async function scheduleReminder(r: Reminder, opts: { prompt?: boolean } = {}): Promise<void> {
  await ensureChannel();
  const granted = opts.prompt ? await ensurePermission() : await hasPermission();
  if (!granted) return;

  if (r.schedule.kind === 'daily') {
    const fire = nextOccurrence(r.schedule.hour, r.schedule.minute);
    await scheduleSingle(r.id, 'd0', buildTimestampTrigger(fire.getTime(), RepeatFrequency.DAILY), notifBody(r));
    return;
  }

  if (r.schedule.kind === 'times') {
    for (let i = 0; i < r.schedule.times.length; i++) {
      const [hStr, mStr] = r.schedule.times[i].split(':');
      const h = Number(hStr);
      const m = Number(mStr);
      if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
      const fire = nextOccurrence(h, m);
      await scheduleSingle(
        r.id,
        `t${i}`,
        buildTimestampTrigger(fire.getTime(), RepeatFrequency.DAILY),
        notifBody(r),
      );
    }
    return;
  }

  // interval — every slot gets a fresh random message so back-to-back pings vary.
  const { minutes, startHour, endHour } = r.schedule;
  if (minutes <= 0) return;
  const slots = computeIntervalSlots(minutes, startHour, endHour, MAX_INTERVAL_SLOTS);
  for (let i = 0; i < slots.length; i++) {
    await scheduleSingle(r.id, `i${i}`, buildTimestampTrigger(slots[i]), notifBody(r));
  }
}

function computeIntervalSlots(
  minutes: number,
  startHour: number,
  endHour: number,
  cap: number
): number[] {
  const now = new Date();
  const slots: number[] = [];
  const stepMs = minutes * 60 * 1000;
  // Walk forward up to 48h
  for (let dayOffset = 0; dayOffset < 2 && slots.length < cap; dayOffset++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + dayOffset);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(endHour, 0, 0, 0);
    for (let t = dayStart.getTime(); t <= dayEnd.getTime() && slots.length < cap; t += stepMs) {
      if (t > now.getTime()) slots.push(t);
    }
  }
  return slots;
}

export async function cancelReminderTriggers(parentId: string): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  const toCancel = ids.filter((id) => id.startsWith(`${parentId}:`));
  if (toCancel.length === 0) return;
  await Promise.all(toCancel.map((id) => notifee.cancelTriggerNotification(id)));
}

export async function sendTestNotification(r: Reminder): Promise<boolean> {
  await ensureChannel();
  const granted = await ensurePermission();
  if (!granted) return false;
  const payload = notifBody(r);
  const fire = Date.now() + 8000;
  await scheduleSingle(
    r.id,
    `test_${Date.now()}`,
    buildTimestampTrigger(fire),
    payload
  );
  return true;
}

export async function rescheduleAll(): Promise<void> {
  const items = await listReminders();
  if (items.length === 0) return;
  if (!(await hasPermission())) return;
  for (const r of items) {
    await cancelReminderTriggers(r.id);
    if (r.enabled) await scheduleReminder(r);
  }
}

export function describeSchedule(s: ReminderSchedule): string {
  if (s.kind === 'daily') return `Daily · ${pad(s.hour)}:${pad(s.minute)}`;
  if (s.kind === 'times') return `${s.times.length} time${s.times.length === 1 ? '' : 's'} daily`;
  return `Every ${s.minutes}m · ${pad(s.startHour)}:00–${pad(s.endHour)}:00`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ----- hook -----

export function useReminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setItems(await listReminders());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh } as const;
}
