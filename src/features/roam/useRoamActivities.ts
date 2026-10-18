import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { computeStats } from '@/src/features/roam/geo';
import { isAuthError } from '@/src/lib/api';
import {
  listActivities,
  type ActivityListResponse,
  type ActivitySummary,
  type CreateActivityInput,
} from '@/src/lib/api/activities';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { getOfflineQueue } from '@/src/lib/cache/indexeddb';
import { onOfflineSync } from '@/src/lib/offline/syncEngine';

/**
 * A Roam saved offline, still in the upload queue — shown in the list so it
 * doesn't look lost. Numbers come from the same rules as the backend (geo.ts);
 * XP is only known once it's uploaded.
 */
export function pendingSummary(input: CreateActivityInput): ActivitySummary {
  const stats = computeStats(input.points, input.activity_type, input.vehicle_windows);
  const elapsed = (new Date(input.ended_at).getTime() - new Date(input.started_at).getTime()) / 1000;
  return {
    id: `pending-${input.client_activity_id}`,
    activity_type: input.activity_type,
    name: input.name ?? null,
    started_at: input.started_at,
    ended_at: input.ended_at,
    local_date: input.local_date,
    elapsed_time_sec: Math.max(0, Math.round(elapsed)),
    moving_time_sec: stats.movingTimeSec,
    distance_m: stats.distanceM,
    avg_speed_mps: stats.avgSpeedMps,
    max_speed_mps: stats.maxSpeedMps,
    avg_pace_sec_per_km: stats.avgPaceSecPerKm,
    vehicle_distance_m: stats.vehicleDistanceM,
    vehicle_detected: stats.vehicleDetected,
    xp_eligible: stats.xpEligible,
    xp: 0,
    steps: stats.steps,
  };
}

async function loadPending(): Promise<ActivitySummary[]> {
  const queue = await getOfflineQueue().catch(() => []);
  return queue
    .filter((m) => m.type === 'SAVE_ACTIVITY' && m.payload?.points)
    .map((m) => pendingSummary(m.payload as CreateActivityInput))
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/** Roam history + this week's totals: cached first, refreshed on every focus. */
export function useRoamActivities(userId: string | undefined) {
  const [data, setData] = useState<ActivityListResponse | null>(null);
  const [pending, setPending] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false); // nothing to load without a signed-in user
      return;
    }
    loadPending().then(setPending);
    const key = cacheKeys.roamActivities(userId);
    const cached = await cacheGetStale<ActivityListResponse>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    try {
      const fresh = await listActivities();
      setData(fresh);
      setError(null);
      setOffline(false);
      await cacheSet(key, fresh, cacheTTL.LONG);
    } catch (e) {
      if (isAuthError(e)) return;
      // Offline with a cached list on screen: nothing to report.
      const noNetwork = !(e as { status?: number })?.status;
      setOffline(noNetwork);
      setError(
        cached
          ? null
          : noNetwork
            ? "You're offline. Your past Roams will load when you reconnect."
            : 'Could not load your Roams.',
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // A Roam saved offline just uploaded: swap its pending row for the real one.
  useEffect(() => onOfflineSync(() => refresh()), [refresh]);

  return { data, pending, loading, error, offline, refresh };
}
