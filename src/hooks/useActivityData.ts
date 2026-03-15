import { useMemo } from 'react';
import { WorkoutSession } from '@/src/lib/api/workoutSessions';

interface ActivityData {
  days: Map<string, number>;
  totalActiveDays: number;
  maxStreak: number;
  loading: boolean;
}

const DEFAULTS: ActivityData = { days: new Map(), totalActiveDays: 0, maxStreak: 0, loading: true };

function computeActivityData(sessions: WorkoutSession[]) {
  const completed = sessions.filter((s) => s.status === 'completed');

  const dayMap = new Map<string, number>();

  completed.forEach((session) => {
    const dateStr = (session.finished_at || session.started_at || session.created_at).slice(0, 10);
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
    totalActiveDays: dayMap.size,
    maxStreak,
  };
}

export function useActivityData(sessions?: WorkoutSession[]): ActivityData {
  const result = useMemo(() => {
    if (!sessions) return null;
    return computeActivityData(sessions);
  }, [sessions]);

  if (!result) return { ...DEFAULTS, loading: !sessions };
  return { ...result, loading: false };
}
