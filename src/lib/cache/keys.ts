export const cacheKeys = {
  userProfile: (userId: string) => `user:${userId}`,
  userMetrics: (userId: string) => `metrics:${userId}`,
  onboardingStatus: (userId: string) => `onboarding:${userId}`,
  workoutPlans: (userId: string) => `plans:${userId}`,
  exercises: 'exercises:all',
  // The whole exercise catalog (summary fields only) for instant local search
  // and full offline browse — synced daily, searched on the device.
  exerciseCatalog: 'exercises:catalog',
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
  roamHeatmap: (userId: string) => `roam:heatmap:${userId}`,
  // Workouts tab
  routines: (userId: string) => `workouts:routines:${userId}`,
  workoutHistory: (userId: string) => `workouts:history:${userId}`,
  workoutSession: (sessionId: string) => `workouts:session:${sessionId}`,
  programs: 'workouts:programs',
  workoutLiveActivity: 'workouts:live-activity',
  workoutNotificationOpen: 'workouts:notification-open',
  roamActivity: (userId: string, id: string) => `roam:activity:${userId}:${id}`,
  // Diet — per local day / range, user-scoped so accounts on one device never mix.
  dietLogs: (userId: string, date: string) => `diet:logs:${userId}:${date}`,
  dietSummary: (userId: string, from: string, to: string) => `diet:summary:${userId}:${from}:${to}`,
  dietRecentFoods: (userId: string) => `diet:recent-foods:${userId}`,
  // Reports: the last AI report status, so a written report opens offline.
  aiReport: (userId: string) => `reports:ai:${userId}`,
  // Progress tab — per date range; the summary (streak, totals, records) is one per user.
  progressDaily: (userId: string, from: string, to: string) => `progress:daily:${userId}:${from}:${to}`,
  progressStrength: (userId: string, from: string, to: string) => `progress:strength:${userId}:${from}:${to}`,
  progressSummary: (userId: string) => `progress:summary:${userId}`,
  // Plan from the onboarding answers (GET /plan) and the Home "plan ready" card's dismissal.
  plan: (userId: string) => `plan:${userId}`,
  planIntroDismissed: (userId: string) => `plan:intro-dismissed:${userId}`,
  // Daily activity + diet goals (GET /goals); a reached goal's notification, once per day.
  goals: (userId: string) => `goals:${userId}`,
  goalNotified: (userId: string, date: string) => `goals:notified:${userId}:${date}`,
  // Friends list + incoming request count (GET /friends) and pending requests, shown offline.
  friends: (userId: string) => `friends:${userId}`,
  friendRequests: (userId: string, direction: 'incoming' | 'outgoing') => `friends:requests:${direction}:${userId}`,
  // Arena leaderboards, per board / scope / period / local date (shown offline as last seen).
  arenaBoard: (userId: string, board: string, scope: string, period: string, date: string) => `arena:${userId}:${board}:${scope}:${period}:${date}`,
  // In-app notifications (GET /notifications) — the list and the bell's unread badge.
  notifications: (userId: string) => `notifications:${userId}`,

  exerciseUsage: (userId: string) => `exercise:usage:${userId}`,
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
