export const cacheKeys = {
  userProfile: (userId: string) => `user:${userId}`,
  userMetrics: (userId: string) => `metrics:${userId}`,
  onboardingStatus: (userId: string) => `onboarding:${userId}`,
  workoutPlans: (userId: string) => `plans:${userId}`,
  exercises: 'exercises:all',
  exerciseCategories: 'exercises:categories',
  dashboard: (userId: string) => `dashboard:${userId}`,
  bodyMetricsLatest: (userId: string) => `bodyMetrics:latest:${userId}`,
  bodyMetricsHistory: (userId: string) => `bodyMetrics:history:${userId}`,
  fitnessProfile: (userId: string) => `fitnessProfile:${userId}`,
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
