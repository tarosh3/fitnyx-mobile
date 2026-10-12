import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import type { ActivityType } from '@/src/features/roam/geo';

/** Mirrors the backend's limit (activity_handler.go maxActivityNameLen). */
export const MAX_ACTIVITY_NAME = 60;

/** "Morning Run", "Lunch Walk", "Evening Ride", "Night Run" — by local start hour. */
export function defaultActivityName(type: ActivityType, startedAt: Date | string): string {
  const hour = new Date(startedAt).getHours();
  const part =
    hour >= 5 && hour < 11 ? 'Morning' : hour >= 11 && hour < 14 ? 'Lunch' : hour >= 14 && hour < 17 ? 'Afternoon' : hour >= 17 && hour < 21 ? 'Evening' : 'Night';
  return `${part} ${ACTIVITY_LABEL[type]}`;
}

/** The title to show: the user's name, else the default. */
export function activityTitle(a: { name?: string | null; activity_type: ActivityType; started_at: string }): string {
  return a.name?.trim() || defaultActivityName(a.activity_type, a.started_at);
}

/** Trims and collapses whitespace like the server; '' means "use the default". */
export function cleanActivityName(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_ACTIVITY_NAME);
}
