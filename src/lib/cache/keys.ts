export const cacheKeys = {
  userProfile: (userId: string) => `user:${userId}`,
  userMetrics: (userId: string) => `metrics:${userId}`,
  onboardingStatus: (userId: string) => `onboarding:${userId}`,
  workoutPlans: (userId: string) => `plans:${userId}`,
  exercises: 'exercises:all',
  // First page of the exercise list per filter combination (offline fallback).
  exerciseListPage: (filters: string) => `exercises:list:${filters}`,
  exerciseCategories: 'exercises:categories',
  exerciseHistory: (uuid: string) => `exercise-history:${uuid}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  // Per local day, so yesterday's insight is never served after midnight.
  dailyInsight: (userId: string, date: string) => `daily-insight:${userId}:${date}`,
  bodyMetricsLatest: (userId: string) => `bodyMetrics:latest:${userId}`,
  bodyMetricsHistory: (userId: string) => `bodyMetrics:history:${userId}`,
  fitnessProfile: (userId: string) => `fitnessProfile:${userId}`,
  roamActivities: (userId: string) => `roam:activities:${userId}`,
  // Workouts tab
  routines: (userId: string) => `workouts:routines:${userId}`,
  workoutHistory: (userId: string) => `workouts:history:${userId}`,
  workoutSession: (sessionId: string) => `workouts:session:${sessionId}`,
  programs: 'workouts:programs',
  roamActivity: (userId: string, id: string) => `roam:activity:${userId}:${id}`,
  // Diet — per local day / range, user-scoped so accounts on one device never mix.
  dietLogs: (userId: string, date: string) => `diet:logs:${userId}:${date}`,
  dietSummary: (userId: string, from: string, to: string) => `diet:summary:${userId}:${from}:${to}`,
  dietRecentFoods: (userId: string) => `diet:recent-foods:${userId}`,
} as const;

export const cacheTTL = {
  SHORT: 1 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 30 * 60 * 1000,
  VERY_LONG: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

export const staleTime = {
  INSTANT: 0,
  SHORT: 10 * 1000,
  MEDIUM: 30 * 1000,
  LONG: 60 * 1000,
} as const;
