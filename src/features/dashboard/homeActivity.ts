import type { DashboardSession } from '@/src/lib/api/dashboard';

/** Completed training in today and the preceding six local calendar dates. */
export function getRecentTraining(sessions: DashboardSession[], today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  let workouts = 0;
  let volume = 0;
  let durationSeconds = 0;
  let calories = 0;
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const completedAt = new Date(session.finished_at || session.started_at);
    if (completedAt < start || completedAt >= end || Number.isNaN(completedAt.getTime())) continue;
    workouts += 1;
    volume += session.total_volume_kg || 0;
    durationSeconds += session.total_duration_sec || 0;
    // The server's estimate (body weight × intensity); 350 kcal/h when it has none.
    calories += session.kcal ?? Math.round(((session.total_duration_sec || 0) / 3600) * 350);
  }

  return {
    workouts,
    volume,
    durationMinutes: Math.round(durationSeconds / 60),
    calories,
  };
}
