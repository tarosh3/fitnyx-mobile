import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { WorkoutPlanDay } from '@/src/lib/api/workoutPlans';
import { getDashboard, DashboardSession, DashboardPlan, DashboardPlanDay } from '@/src/lib/api/dashboard';
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
  activePlan: DashboardPlan | null;
  currentDay: DashboardPlanDay | null;
  currentDayIndex: number;
  totalDays: number;
  planProgress: number;
  nextExercisesCount: number;
  activeSession: WorkoutSession | null;
  sessions: DashboardSession[];
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
  // Single server request replaces the previous 3-5 waterfall calls
  const dashboard = await getDashboard();

  const sessions = dashboard.sessions || [];
  const { streak, xp, level, weeklyStats } = calculateStats(sessions);

  // Plan progress: how many unique days in this plan have been completed
  let planProgress = 0;
  if (dashboard.active_plan && dashboard.total_days > 0) {
    const completedDayIds = new Set(
      sessions
        .filter((s) => s.plan_id === dashboard.active_plan!.id && s.status === 'completed' && s.day_id)
        .map((s) => s.day_id)
    );
    planProgress = Math.round((completedDayIds.size / dashboard.total_days) * 100);
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
    activePlan: dashboard.active_plan,
    currentDay: dashboard.current_day,
    currentDayIndex: dashboard.current_day_index || 1,
    totalDays: dashboard.total_days,
    planProgress,
    nextExercisesCount: dashboard.current_day?.exercise_count ?? 0,
    sessions,
    dailyInsight: dashboard.daily_insight || '',
  };
}

export function useRetentionMetrics(userId?: string) {
  const queryClient = useQueryClient();
  const { activeSession } = useWorkout();

  const { data, isLoading, isFetching, isError } = useQuery({
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
    return { ...DEFAULTS, activeSession, loading: isLoading, error: isError, refresh };
  }

  return { ...data, activeSession, loading: false, error: false, refresh };
}

// Query key export for external invalidation (e.g. after completing a workout)
export const retentionMetricsKey = (userId?: string) => ['retentionMetrics', userId];

function calculateStats(sessions: DashboardSession[]) {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionDates = new Set(
    sessions
      .filter((session) => session.status === 'completed')
      .map((session) => {
        const date = new Date(session.finished_at || session.started_at);
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

  sessions.forEach((session) => {
    if (session.status === 'completed') {
      totalXp += 300;
      if (session.total_duration_sec) totalXp += Math.round((session.total_duration_sec / 60) * 5);
      if (session.total_volume_kg) totalXp += Math.round(session.total_volume_kg / 100);
    }

    const date = new Date(session.finished_at || session.started_at);
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
