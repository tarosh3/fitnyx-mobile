import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSessionsHistory, WorkoutSession } from '@/src/lib/api/workoutSessions';
import {
  getWorkoutPlans,
  getPlanDays,
  getDayExercises,
  WorkoutPlan,
  WorkoutPlanDay,
} from '@/src/lib/api/workoutPlans';
import { getDailyInsight } from '@/src/lib/api/agent';
import { useWorkout } from '@/src/providers/WorkoutProvider';

export interface RetentionMetrics {
  streakDays: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  levelProgress: number;
  weeklyWorkouts: number;
  weeklyVolume: number;
  weeklyDuration: number;
  weeklyCalories: number;
  activePlan: WorkoutPlan | null;
  currentDay: WorkoutPlanDay | null;
  currentDayIndex: number;
  totalDays: number;
  planProgress: number;
  nextExercisesCount: number;
  activeSession: WorkoutSession | null;
  sessions: WorkoutSession[];
  dailyInsight?: string;
  loading: boolean;
}

const DEFAULTS: RetentionMetrics = {
  streakDays: 0,
  xp: 0,
  level: 1,
  nextLevelXp: 1000,
  levelProgress: 0,
  weeklyWorkouts: 0,
  weeklyVolume: 0,
  weeklyDuration: 0,
  weeklyCalories: 0,
  activePlan: null,
  currentDay: null,
  currentDayIndex: 1,
  totalDays: 0,
  planProgress: 0,
  nextExercisesCount: 0,
  activeSession: null,
  sessions: [],
  dailyInsight: '',
  loading: true,
};

async function fetchRetentionMetrics(): Promise<Omit<RetentionMetrics, 'loading' | 'activeSession'>> {
  // Parallel batch: independent calls (active session comes from WorkoutProvider)
  const [historyRes, plansRes, insightResult] = await Promise.all([
    getSessionsHistory(1, 200),
    getWorkoutPlans(),
    getDailyInsight().catch(() => null),
  ]);

  const sessions = historyRes.data || [];
  const { streak, xp, level, weeklyStats } = calculateStats(sessions);

  const activePlan = plansRes.data.find((plan) => plan.is_active) || null;

  let currentDay: WorkoutPlanDay | null = null;
  let currentDayIndex = 1;
  let totalDays = 0;
  let planProgress = 0;
  let nextExercisesCount = 0;

  if (activePlan) {
    const daysRes = await getPlanDays(activePlan.id);
    const planDays = daysRes.data.sort((a, b) => a.day_index - b.day_index);
    totalDays = planDays.length;

    const planSessions = sessions.filter(
      (session) => session.plan_id === activePlan.id && session.status === 'completed'
    );
    const completedDayIds = new Set(planSessions.map((session) => session.day_id));
    const completedCount = completedDayIds.size;

    const nextDayIndex = totalDays ? (completedCount % totalDays) + 1 : 1;
    currentDay = planDays.find((day) => day.day_index === nextDayIndex) || planDays[0] || null;
    currentDayIndex = nextDayIndex;
    planProgress = totalDays ? Math.round((completedCount / totalDays) * 100) : 0;

    if (currentDay) {
      try {
        const exRes = await getDayExercises(currentDay.id);
        nextExercisesCount = exRes.data.length;
      } catch {
        nextExercisesCount = 0;
      }
    }
  }

  return {
    streakDays: streak,
    xp,
    level,
    nextLevelXp: level * 1500,
    levelProgress: ((xp % 1500) / 1500) * 100,
    weeklyWorkouts: weeklyStats.workouts,
    weeklyVolume: weeklyStats.volume,
    weeklyDuration: Math.round(weeklyStats.duration / 60),
    weeklyCalories: weeklyStats.calories,
    activePlan,
    currentDay,
    currentDayIndex,
    totalDays,
    planProgress,
    nextExercisesCount,
    sessions,
    dailyInsight: insightResult?.insight ?? '',
  };
}

export function useRetentionMetrics(userId?: string) {
  const queryClient = useQueryClient();
  const { activeSession } = useWorkout();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['retentionMetrics', userId],
    queryFn: fetchRetentionMetrics,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 min — tab switches won't refetch
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev, // keep previous data visible during refetch
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['retentionMetrics', userId] });
  };

  if (!data) {
    return { ...DEFAULTS, activeSession, loading: isLoading, refresh };
  }

  return { ...data, activeSession, loading: false, refresh };
}

// Query key export for external invalidation (e.g. after completing a workout)
export const retentionMetricsKey = (userId?: string) => ['retentionMetrics', userId];

function calculateStats(sessions: WorkoutSession[]) {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionDates = new Set(
    sessions
      .filter((session) => session.status === 'completed')
      .map((session) => {
        const date = new Date(session.finished_at || session.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
  );

  let checkDate = new Date(today);
  if (!sessionDates.has(checkDate.getTime())) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (sessionDates.has(checkDate.getTime())) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (sessionDates.has(checkDate.getTime())) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  } else {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
    while (sessionDates.has(checkDate.getTime())) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  let totalXp = 0;
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let weeklyWorkouts = 0;
  let weeklyVolume = 0;
  let weeklyDuration = 0;

  sessions.forEach((session: any) => {
    totalXp += 300;
    if (session.total_duration_sec) totalXp += Math.round((session.total_duration_sec / 60) * 5);
    if (session.total_volume_kg) totalXp += Math.round(session.total_volume_kg / 100);

    const date = new Date(session.finished_at || session.created_at);
    if (date >= oneWeekAgo && date <= new Date(today.getTime() + 86400000) && session.status === 'completed') {
      weeklyWorkouts += 1;
      weeklyDuration += session.total_duration_sec || 0;
      weeklyVolume += session.total_volume_kg || 0;
    }
  });

  const level = Math.floor(totalXp / 1500) + 1;
  const weeklyCalories = Math.round((weeklyDuration / 3600) * 350);

  return {
    streak,
    xp: totalXp,
    level,
    weeklyStats: {
      workouts: weeklyWorkouts,
      volume: weeklyVolume,
      duration: weeklyDuration,
      calories: weeklyCalories,
    },
  };
}
