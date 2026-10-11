import { useMemo } from 'react';

import { localDateKey } from '@/src/lib/api/workoutSessions';

/** Minimal session shape needed for activity data computation. */
interface SessionLike {
  status: string;
  finished_at?: string | null;
  started_at: string;
}

interface ActivityData {
  days: Map<string, number>;
  totalWorkouts: number;
  totalActiveDays: number;
  maxStreak: number;
  loading: boolean;
}

const DEFAULTS: ActivityData = { days: new Map(), totalWorkouts: 0, totalActiveDays: 0, maxStreak: 0, loading: true };

function computeActivityData(sessions: SessionLike[]) {
  const completed = sessions.filter((s) => s.status === 'completed');

  const dayMap = new Map<string, number>();

  completed.forEach((session) => {
    // Local calendar day, like the heatmap cells and the streak — slicing the
    // UTC timestamp put early-morning workouts (before 05:30 in India) on the
    // previous day.
    const dateStr = localDateKey(new Date(session.finished_at || session.started_at));
    dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
  });

  const sortedDates = Array.from(dayMap.keys()).sort();
  let maxStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < sortedDates.length; i += 1) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  return {
    days: dayMap,
    totalWorkouts: completed.length,
    totalActiveDays: dayMap.size,
    maxStreak,
  };
}

export function useActivityData(sessions?: SessionLike[]): ActivityData {
  const result = useMemo(() => {
    if (!sessions) return null;
    return computeActivityData(sessions);
  }, [sessions]);

  if (!result) return { ...DEFAULTS, loading: !sessions };
  return { ...result, loading: false };
}
