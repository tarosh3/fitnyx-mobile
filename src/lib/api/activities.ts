import { fetchWithAuth } from '@/src/lib/api';
import type { ActivityType, RoamPoint } from '@/src/features/roam/geo';

// Mirrors backend internal/handlers/activity_handler.go (activitySummary /
// activityDetail). All numbers are computed server-side from the track.
export interface ActivitySummary {
  id: string;
  activity_type: ActivityType;
  /** User-given title; null = show defaultActivityName(). Absent from older backends. */
  name?: string | null;
  started_at: string;
  ended_at: string;
  local_date: string;
  elapsed_time_sec: number;
  moving_time_sec: number;
  distance_m: number;
  avg_speed_mps: number;
  max_speed_mps: number;
  avg_pace_sec_per_km: number | null;
  vehicle_distance_m: number;
  vehicle_detected: boolean;
  xp_eligible: boolean;
  xp: number;
}

/** Reserved for a future photos feature — the backend returns [] for now. */
export interface ActivityPhoto {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface ActivityDetail extends ActivitySummary {
  /** Google-encoded polyline of accepted fixes (decode with decodePolyline). */
  route_polyline: string;
  /** Seconds since start for each route point, for replay. Empty for Roams saved before replay existed. */
  route_times?: number[];
  /** Reserved (not used yet); always [] today. */
  photos?: ActivityPhoto[];
  /** Inclusive [start, end] indices into the decoded route travelled by vehicle. */
  vehicle_ranges: [number, number][];
  splits: { km: number; sec: number }[];
}

export interface ActivityWeek {
  count: number;
  distance_m: number;
  moving_time_sec: number;
}

export interface ActivityListResponse {
  data: ActivitySummary[];
  meta: { total: number; page: number; per_page: number };
  week: ActivityWeek;
}

export interface CreateActivityInput {
  /** Generated when recording starts; makes retried uploads idempotent. */
  client_activity_id: string;
  activity_type: ActivityType;
  started_at: string;
  ended_at: string;
  /** Device-local calendar date of the start (YYYY-MM-DD). */
  local_date: string;
  /** Optional title; blank = the app's default ("Morning Run"). */
  name?: string;
  points: RoamPoint[];
}

export async function createActivity(input: CreateActivityInput): Promise<ActivityDetail> {
  return fetchWithAuth('/activities', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listActivities(page = 1, limit = 20): Promise<ActivityListResponse> {
  return fetchWithAuth(`/activities?page=${page}&limit=${limit}`);
}

export async function getActivity(id: string): Promise<ActivityDetail> {
  return fetchWithAuth(`/activities/${id}`);
}

export async function deleteActivity(id: string): Promise<void> {
  return fetchWithAuth(`/activities/${id}`, { method: 'DELETE' });
}

/** Renames a Roam. A blank name clears it (the app shows its default title). */
export async function renameActivity(id: string, name: string): Promise<ActivityDetail> {
  return fetchWithAuth(`/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}
