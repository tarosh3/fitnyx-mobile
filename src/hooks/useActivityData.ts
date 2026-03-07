import { useEffect, useState } from 'react';
import { getSessionsHistory, WorkoutSession } from '@/src/lib/api/workoutSessions';

interface ActivityData {
  days: Map<string, number>;
  totalActiveDays: number;
  maxStreak: number;
  loading: boolean;
}

let cachedActivityData: ActivityData | null = null;

export function useActivityData(userId?: string): ActivityData {
  const [data, setData] = useState<ActivityData>(() => {
    if (cachedActivityData) return cachedActivityData;
    return { days: new Map(), totalActiveDays: 0, maxStreak: 0, loading: true };
  });

  useEffect(() => {
    if (!userId) return;
    loadActivityData();
  }, [userId]);

  const loadActivityData = async () => {
    try {
      const res = await getSessionsHistory(1, 200);
      const sessions = (res.data || []).filter((s: WorkoutSession) => s.status === 'completed');

      const dayMap = new Map<string, number>();

      sessions.forEach((session) => {
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

      const result: ActivityData = {
        days: dayMap,
        totalActiveDays: dayMap.size,
        maxStreak,
        loading: false,
      };

      cachedActivityData = result;
      setData(result);
    } catch (error) {
      console.error('Failed to load activity data', error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  return data;
}
