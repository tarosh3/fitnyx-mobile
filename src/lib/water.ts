// Water intake tracking. Local-only. AsyncStorage keyed by YYYY-MM-DD.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface WaterEntry {
  id: string;
  amountMl: number;
  loggedAt: string; // ISO
}

interface DayLog {
  date: string; // YYYY-MM-DD
  entries: WaterEntry[];
}

const ENTRIES_PREFIX = 'fitnyx:water:day:';
const GOAL_KEY = 'fitnyx:water:goal-ml';
const DEFAULT_GOAL_ML = 2500;

// Hard limits — enforced here in the data layer so every entry point (tap,
// presets, custom input) is capped. The app can't be driven to absurd values
// regardless of any UI bug.
export const WATER_LIMITS = {
  MIN_ENTRY_ML: 1,
  MAX_ENTRY_ML: 2000, // a single log
  MAX_DAILY_ML: 10000, // total per day — safety ceiling
  MAX_ENTRIES_PER_DAY: 50, // stop log-spam from bloating storage
  MIN_GOAL_ML: 500,
  MAX_GOAL_ML: 6000,
} as const;

export type AddStatus = 'ok' | 'clamped' | 'daily-cap' | 'entry-limit' | 'invalid';
export interface AddResult {
  day: DayLog;
  status: AddStatus;
  addedMl: number;
}

export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getGoalMl(): Promise<number> {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_GOAL_ML;
  // Clamp on read too, so a pre-existing out-of-range value can't slip through.
  return Math.min(WATER_LIMITS.MAX_GOAL_ML, Math.max(WATER_LIMITS.MIN_GOAL_ML, Math.round(n)));
}

export async function setGoalMl(ml: number): Promise<void> {
  const safe = Number.isFinite(ml) ? Math.round(ml) : DEFAULT_GOAL_ML;
  const clamped = Math.min(WATER_LIMITS.MAX_GOAL_ML, Math.max(WATER_LIMITS.MIN_GOAL_ML, safe));
  await AsyncStorage.setItem(GOAL_KEY, String(clamped));
}

export async function getDay(date: string): Promise<DayLog> {
  const raw = await AsyncStorage.getItem(ENTRIES_PREFIX + date);
  if (!raw) return { date, entries: [] };
  try {
    const parsed = JSON.parse(raw) as DayLog;
    return parsed.entries ? parsed : { date, entries: [] };
  } catch {
    return { date, entries: [] };
  }
}

export async function addEntry(amountMl: number, when: Date = new Date()): Promise<AddResult> {
  const date = ymd(when);
  const day = await getDay(date);

  if (!Number.isFinite(amountMl) || amountMl <= 0) {
    return { day, status: 'invalid', addedMl: 0 };
  }
  if (day.entries.length >= WATER_LIMITS.MAX_ENTRIES_PER_DAY) {
    return { day, status: 'entry-limit', addedMl: 0 };
  }

  // Cap the single log, then cap so the running daily total can't exceed the ceiling.
  const requested = Math.min(Math.round(amountMl), WATER_LIMITS.MAX_ENTRY_ML);
  const remaining = WATER_LIMITS.MAX_DAILY_ML - sumMl(day);
  if (remaining <= 0) {
    return { day, status: 'daily-cap', addedMl: 0 };
  }

  const addedMl = Math.min(requested, remaining);
  const entry: WaterEntry = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    amountMl: addedMl,
    loggedAt: when.toISOString(),
  };
  const next: DayLog = { date, entries: [...day.entries, entry] };
  await AsyncStorage.setItem(ENTRIES_PREFIX + date, JSON.stringify(next));

  const status: AddStatus = addedMl < Math.round(amountMl) ? 'clamped' : 'ok';
  return { day: next, status, addedMl };
}

export async function removeEntry(date: string, entryId: string): Promise<DayLog> {
  const day = await getDay(date);
  const next: DayLog = { ...day, entries: day.entries.filter((e) => e.id !== entryId) };
  await AsyncStorage.setItem(ENTRIES_PREFIX + date, JSON.stringify(next));
  return next;
}

/** Bulk-delete: wipe every entry logged on the given day. */
export async function clearDay(date: string): Promise<DayLog> {
  await AsyncStorage.removeItem(ENTRIES_PREFIX + date);
  return { date, entries: [] };
}

export function sumMl(day: DayLog): number {
  return day.entries.reduce((acc, e) => acc + e.amountMl, 0);
}

export async function getMonthTotals(
  year: number,
  monthIndex: number
): Promise<{ date: string; total: number }[]> {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    keys.push(ENTRIES_PREFIX + date);
  }
  const pairs = await AsyncStorage.multiGet(keys);
  return pairs.map(([key, raw]) => {
    const date = key.replace(ENTRIES_PREFIX, '');
    if (!raw) return { date, total: 0 };
    try {
      const parsed = JSON.parse(raw) as DayLog;
      return { date, total: sumMl(parsed) };
    } catch {
      return { date, total: 0 };
    }
  });
}

// ----- hooks -----

export function useWaterToday() {
  const [day, setDay] = useState<DayLog>({ date: ymd(), entries: [] });
  const [goalMl, setGoalState] = useState<number>(DEFAULT_GOAL_ML);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [d, g] = await Promise.all([getDay(ymd()), getGoalMl()]);
    setDay(d);
    setGoalState(g);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (ml: number): Promise<AddResult> => {
    const res = await addEntry(ml);
    setDay(res.day);
    return res;
  }, []);

  const remove = useCallback(async (id: string) => {
    const next = await removeEntry(ymd(), id);
    setDay(next);
  }, []);

  const clearAll = useCallback(async () => {
    const next = await clearDay(ymd());
    setDay(next);
  }, []);

  const setGoal = useCallback(async (ml: number) => {
    await setGoalMl(ml);
    setGoalState(await getGoalMl());
  }, []);

  return { day, goalMl, totalMl: sumMl(day), loading, refresh, add, remove, clearAll, setGoal } as const;
}
