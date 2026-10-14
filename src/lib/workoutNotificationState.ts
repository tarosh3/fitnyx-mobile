import type { WorkoutSession } from '@/src/lib/api/workoutSessions';

export type WorkoutNotificationState = 'ready' | 'running' | 'paused';

export function getWorkoutState(session: WorkoutSession): WorkoutNotificationState {
  return session.status === 'in_progress' ? 'running' : session.total_duration_sec === 0 ? 'ready' : 'paused';
}

/** The stored duration excludes the current running interval. Never add paused time. */
export function elapsedForSession(session: WorkoutSession, now = Date.now()): number {
  const base = Math.max(0, session.total_duration_sec || 0);
  if (session.status !== 'in_progress') return base;
  const resumed = new Date(session.last_resumed_at || session.started_at).getTime();
  return base + (Number.isFinite(resumed) ? Math.max(0, Math.floor((now - resumed) / 1000)) : 0);
}

export function formatWorkoutElapsed(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
}

export const workoutActionLabel = { ready: 'Start', running: 'Pause', paused: 'Resume' } as const;
