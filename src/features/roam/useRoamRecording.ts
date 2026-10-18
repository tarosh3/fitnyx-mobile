import { Platform } from 'react-native';
import { ensurePermission } from '@/src/lib/reminders';
import { drainRoamControls, syncRoamNotification, subscribeRoamControls } from './notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { computeStats, type ActivityType, type RoamPoint, type RoamStats } from '@/src/features/roam/geo';
import {
  activeElapsedMs,
  clearRecording,
  finishRecording,
  getRecordingFor,
  loadPoints,
  pauseRecording,
  resumeRecording,
  startRecording,
  subscribe,
  type RecordingMeta,
} from '@/src/features/roam/recordingStore';
import { requestMotionPermission } from '@/src/features/roam/motion';
import { requestRoamPermission, startLocationUpdates, stopLocationUpdates, type PermissionResult } from '@/src/features/roam/tracking';
import { useAuth } from '@/src/providers/AuthProvider';

export interface RoamRecording {
  meta: RecordingMeta | null;
  points: RoamPoint[];
  stats: RoamStats | null;
  elapsedMs: number;
  loading: boolean;
  /** Returns the permission outcome; recording starts only when 'granted'. */
  start: (type: ActivityType) => Promise<PermissionResult>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Stops GPS and returns the final track (still stored until saved/discarded). */
  finish: () => Promise<{ meta: RecordingMeta; points: RoamPoint[] } | null>;
  discard: () => Promise<void>;
}

/** Live view over the persisted recording (survives app restarts). */
export function useRoamRecording(): RoamRecording {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [meta, setMeta] = useState<RecordingMeta | null>(null);
  const [points, setPoints] = useState<RoamPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(async (restoreLocation = true) => {
    // A notification can cold-launch the route before auth restoration ends.
    // Keep the route loading instead of treating that moment as no recording.
    if (authLoading) { setLoading(true); return; }
    await drainRoamControls();
    const m = await getRecordingFor(userId);
    // Only once we know who's signed in: a null user may just be auth still
    // restoring, and stopping GPS then would kill a live run.
    if ((!m && userId) || m?.finishedAtMs) await stopLocationUpdates();
    // Still recording: (re)start GPS. A kill or crash takes Android's location
    // foreground service down while the task registration survives, so this
    // forces a restart — otherwise the run stops gaining distance once the
    // screen locks.
    if (restoreLocation && m && !m.finishedAtMs) await startLocationUpdates(m.type, true).catch(() => undefined);
    setMeta(m);
    await syncRoamNotification(true);
    setPoints(m ? await loadPoints() : []);
    setLoading(false);
  }, [userId, authLoading]);

  useEffect(() => {
    reload();
    const native = subscribeRoamControls(() => { void reload(false); });
    const unsubscribe = subscribe((added, m) => {
      setMeta({ ...m });
      if (added.length) setPoints((prev) => prev.concat(added));
    });
    // Fixes may have been stored by a background run of the task with no UI
    // attached — re-read everything when the app comes back.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload();
    });
    return () => {
      native();
      unsubscribe();
      sub.remove();
    };
  }, [reload]);

  useEffect(() => {
    if (!meta) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [meta]);

  const stats = useMemo(() => (meta ? computeStats(points, meta.type) : null), [points, meta?.type]);

  const start = useCallback(async (type: ActivityType) => {
    const permission = await requestRoamPermission();
    if (permission !== 'granted') return permission;
    // Notification permission is optional for GPS, but requested in context on
    // Android so the ongoing controls can appear in the notification drawer.
    if (Platform.OS === 'android') await ensurePermission();
    // Steps and vehicle detection sharpen the numbers; optional too.
    await requestMotionPermission();
    const m = await startRecording(type, userId);
    setMeta(m);
    setPoints([]);
    try {
      await startLocationUpdates(type);
      await syncRoamNotification(true);
    } catch (error) {
      await clearRecording();
      setMeta(null);
      throw error;
    }
    return permission;
  }, [userId]);

  const pause = useCallback(async () => {
    await drainRoamControls();
    // Keep the already-authorized location task alive for background Resume.
    // Paused fixes are discarded; no distance or route is recorded during rest.
    setMeta(await pauseRecording());
    await syncRoamNotification(true);
  }, []);

  const resume = useCallback(async () => {
    await drainRoamControls();
    const m = await resumeRecording();
    setMeta(m);
    if (m) await startLocationUpdates(m.type);
    await syncRoamNotification(true);
  }, []);

  const finish = useCallback(async () => {
    await stopLocationUpdates();
    await drainRoamControls();
    const m = await finishRecording();
    await syncRoamNotification(true);
    if (!m) return null;
    setMeta(m);
    const p = await loadPoints();
    setPoints(p);
    return { meta: m, points: p };
  }, []);

  const discard = useCallback(async () => {
    await stopLocationUpdates();
    await clearRecording();
    await syncRoamNotification(true);
    setMeta(null);
    setPoints([]);
  }, []);

  return {
    meta,
    points,
    stats,
    elapsedMs: meta ? activeElapsedMs(meta, now) : 0,
    loading,
    start,
    pause,
    resume,
    finish,
    discard,
  };
}
