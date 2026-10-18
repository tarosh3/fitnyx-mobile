import { loadWorkoutDetails } from '@/src/lib/workoutActivityDetails';
import { pendingWorkoutControls } from '@/src/lib/nativeWorkoutControls';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LiveActivity from 'expo-live-activity';
import { NativeModules, Platform } from 'react-native';

import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { cacheKeys } from '@/src/lib/cache/keys';
import { elapsedForSession, getWorkoutState } from '@/src/lib/workoutNotificationState';
import { colors } from '@/src/theme/colors';

type SavedActivity = { id: string; sessionId: string };
let saved: SavedActivity | null | undefined;

/** Persist the native ID so a JS reload updates the existing lock-screen card. */
export async function syncWorkoutLiveActivity(session: WorkoutSession | null): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    if (saved === undefined) {
      const raw = await AsyncStorage.getItem(cacheKeys.workoutLiveActivity);
      try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
    }
    if (saved && saved.sessionId !== session?.id) {
      try { LiveActivity.stopActivity(saved.id, { title: 'Session ended' }); }
      catch { /* The user may have dismissed it from the lock screen. */ }
      saved = null;
      await AsyncStorage.removeItem(cacheKeys.workoutLiveActivity);
    }
    if (!session) return false;
    const controls = NativeModules.FitNyxWorkoutControls;
    if (saved && controls?.getActiveActivityIds && !(await controls.getActiveActivityIds()).includes(saved.id)) {
      saved = null;
      await AsyncStorage.removeItem(cacheKeys.workoutLiveActivity);
    }
    if ((await pendingWorkoutControls()).some((entry) => entry.sessionId === session.id)) return true;
    const details = await loadWorkoutDetails(session.id);
    const phase = getWorkoutState(session);
    const elapsed = elapsedForSession(session);
    const state: LiveActivity.LiveActivityState = {
      title: details.title, subtitle: JSON.stringify({ sessionId: session.id, elapsed, sets: details.sets, volumeKg: details.volumeKg, restEnd: details.restEnd, revision: Date.now() }),
      // The custom widget treats 0/1 as ready/paused, never as a fake goal bar.
      progressBar: phase === 'running' ? { elapsedTimer: { startDate: Date.now() - elapsed * 1000 } } : { progress: phase === 'ready' ? 0 : 1 },
    };
    if (saved) {
      try { LiveActivity.updateActivity(saved.id, state); return true; }
      catch { saved = null; await AsyncStorage.removeItem(cacheKeys.workoutLiveActivity); }
    }
    const id = LiveActivity.startActivity(state, {
      backgroundColor: colors.dark.background, titleColor: colors.dark.text, subtitleColor: colors.dark.mutedText,
      progressViewTint: colors.dark.primary, progressViewLabelColor: colors.dark.text,
      deepLinkUrl: `fitnyxmobile:///workouts/session/${encodeURIComponent(session.id)}`, timerType: 'digital',
    });
    if (id) {
      saved = { id, sessionId: session.id };
      await AsyncStorage.setItem(cacheKeys.workoutLiveActivity, JSON.stringify(saved));
      return true;
    }
  } catch (error) { console.warn('Live Activity unavailable', error); }
  return false;
}
