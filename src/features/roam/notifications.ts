import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LiveActivity from 'expo-live-activity';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { activeElapsedMs, getRecording, loadPoints, pauseRecording, resumeRecording, type RecordingMeta } from './recordingStore';
import { computeStats, type RoamPoint, type RoamStats } from './geo';
import { checkGoalMilestones } from './goalTracker';
import { colors } from '@/src/theme/colors';

const activityKey = 'fitnyx-roam:live-activity';
const bridge = Platform.OS === 'ios' ? NativeModules.FitNyxWorkoutControls : NativeModules.FitNyxRoamControls;
type Action = { id: string; kind?: string; sessionId: string; action: string; timestamp?: string; timestampMs?: number };
async function pending(): Promise<Action[]> {
  if (!bridge) return [];
  const result = await bridge.getPendingActions();
  return (typeof result === 'string' ? JSON.parse(result) : result).filter((entry: Action) => entry.kind === 'roam');
}
export function subscribeRoamControls(listener: () => void) {
  if (!bridge) return () => {};
  const sub = new NativeEventEmitter(bridge).addListener(Platform.OS === 'ios' ? 'onWorkoutControl' : 'onRoamControl', listener);
  return () => sub.remove();
}
let draining: Promise<void> | undefined;
export function drainRoamControls(): Promise<void> {
  if (draining) return draining;
  draining = (async () => {
    const seen = new Set<string>();
    while (true) {
      const batch = (await pending()).filter((entry) => !seen.has(entry.id));
      if (!batch.length) return;
      for (const entry of batch) {
        seen.add(entry.id);
        const meta = await getRecording();
        if (meta?.clientId === entry.sessionId && !meta.finishedAtMs) {
          const timestamp = entry.timestampMs ?? Date.parse(entry.timestamp ?? '');
          if (!Number.isFinite(timestamp)) throw new Error('Invalid Roam control timestamp');
          if (entry.action === 'pause') await pauseRecording(timestamp);
          else if (entry.action === 'resume') await resumeRecording(timestamp);
        }
        await bridge.acknowledgeActions([entry.id]);
      }
    }
  })().finally(() => { draining = undefined; });
  return draining;
}

export function roamSnapshot(meta: RecordingMeta, points: RoamPoint[], now = Date.now(), stats: RoamStats = computeStats(points, meta.type)) {
  const elapsed = Math.floor(activeElapsedMs(meta, now) / 1000);
  const pace = stats.avgPaceSecPerKm;
  const last = points.at(-1);
  const recent = last && now - (meta.startedAtMs + last[2] * 1000) < 30000;
  return {
    kind: 'roam', sessionId: meta.clientId, activityType: meta.type,
    phase: meta.status === 'recording' ? 'running' : 'paused',
    elapsed, anchor: meta.status === 'recording' ? now - elapsed * 1000 : undefined,
    sets: 0, volumeKg: 0, revision: now,
    distanceM: stats.distanceM,
    pace: pace == null || !Number.isFinite(pace) ? '—' : `${Math.floor(Math.round(pace) / 60)}:${String(Math.round(pace) % 60).padStart(2, '0')}`,
    speed: stats.movingTimeSec > 0 ? (stats.avgSpeedMps * 3.6).toFixed(1) : '—',
    gps: stats.inVehicleNow ? 'Vehicle speed excluded' : !recent ? 'Waiting for GPS' : last[3] > 30 ? 'Weak GPS signal' : 'GPS connected',
  };
}

let queue = Promise.resolve();
let lastUpdate = 0;
/** Serialized with a bounded GPS refresh rate; native clocks tick independently. */
export function syncRoamNotification(force = false): Promise<void> {
  queue = queue.catch(() => undefined).then(async () => {
    if (Platform.OS === 'web') return;
    if (!force && Date.now() - lastUpdate < 5000) return;
    await drainRoamControls();
    const meta = await getRecording();
    const raw = Platform.OS === 'ios' ? await AsyncStorage.getItem(activityKey) : null;
    let saved: { id: string; sessionId: string } | null = null;
    try { saved = raw ? JSON.parse(raw) : null; } catch { /* Invalid cache. */ }
    if (saved && bridge?.getActiveActivityIds && !(await bridge.getActiveActivityIds()).includes(saved.id)) {
      saved = null;
      await AsyncStorage.removeItem(activityKey);
    }
    if (!meta || meta.finishedAtMs) {
      if (saved) {
        LiveActivity.stopActivity(saved.id, { title: 'Roam finished' });
        await AsyncStorage.removeItem(activityKey);
      }
      if (Platform.OS === 'android') await bridge?.clear();
      return;
    }
    const points = await loadPoints();
    const stats = computeStats(points, meta.type);
    // Daily goals: halfway / reached notifications, also while the screen is off.
    if (meta.status === 'recording') void checkGoalMilestones(meta.clientId, stats);
    const snapshot = roamSnapshot(meta, points, Date.now(), stats);
    if ((await pending()).some((action) => action.sessionId === meta.clientId)) return;
    if (Platform.OS === 'android') {
      await bridge?.update(JSON.stringify(snapshot));
    } else if (Platform.OS === 'ios') {
      if (saved && saved.sessionId !== meta.clientId) {
        LiveActivity.stopActivity(saved.id, { title: 'Roam finished' });
        saved = null;
      }
      const state: LiveActivity.LiveActivityState = {
        title: 'FitNyx Roam', subtitle: JSON.stringify(snapshot),
        progressBar: snapshot.anchor != null ? { elapsedTimer: { startDate: snapshot.anchor } } : { progress: 1 },
      };
      if (saved) {
        try { LiveActivity.updateActivity(saved.id, state); lastUpdate = Date.now(); return; } catch { saved = null; }
      }
      const id = LiveActivity.startActivity(state, {
        backgroundColor: colors.dark.background, titleColor: colors.dark.text,
        deepLinkUrl: `fitnyxmobile:///roam/record?recordingId=${meta.clientId}`, timerType: 'digital',
      });
      if (id) await AsyncStorage.setItem(activityKey, JSON.stringify({ id, sessionId: meta.clientId }));
    }
    lastUpdate = Date.now();
  }).catch((error) => console.warn('Roam live controls unavailable', error));
  return queue;
}
