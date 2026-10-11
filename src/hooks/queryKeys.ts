// React Query keys shared across modules. Kept dependency-free so providers
// (e.g. WorkoutProvider) can invalidate a query without importing the hook
// that defines it — useRetentionMetrics itself imports WorkoutProvider.
export const retentionMetricsKey = (userId?: string) => ['retentionMetrics', userId];
