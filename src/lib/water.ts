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

export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getGoalMl(): Promise<number> {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL_ML;
}

export async function setGoalMl(ml: number): Promise<void> {
  await AsyncStorage.setItem(GOAL_KEY, String(Math.max(250, Math.round(ml))));
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

export async function addEntry(amountMl: number, when: Date = new Date()): Promise<DayLog> {
  if (!Number.isFinite(amountMl) || amountMl <= 0) {
    return getDay(ymd(when));
  }
  const date = ymd(when);
  const day = await getDay(date);
  const entry: WaterEntry = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    amountMl: Math.round(amountMl),
    loggedAt: when.toISOString(),
  };
  const next: DayLog = { date, entries: [...day.entries, entry] };
  await AsyncStorage.setItem(ENTRIES_PREFIX + date, JSON.stringify(next));
  return next;
}

export async function removeEntry(date: string, entryId: string): Promise<DayLog> {
  const day = await getDay(date);
  const next: DayLog = { ...day, entries: day.entries.filter((e) => e.id !== entryId) };
  await AsyncStorage.setItem(ENTRIES_PREFIX + date, JSON.stringify(next));
  return next;
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

  const add = useCallback(async (ml: number) => {
    const next = await addEntry(ml);
    setDay(next);
  }, []);

  const remove = useCallback(async (id: string) => {
    const next = await removeEntry(ymd(), id);
    setDay(next);
  }, []);

  const setGoal = useCallback(async (ml: number) => {
    await setGoalMl(ml);
    setGoalState(await getGoalMl());
  }, []);

  return { day, goalMl, totalMl: sumMl(day), loading, refresh, add, remove, setGoal } as const;
}
