import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { ActivityType } from '@/src/features/roam/geo';
import { drainRoamControls, syncRoamNotification } from '@/src/features/roam/notifications';
import { readStepSample, startMotionTracking, stopMotionTracking } from '@/src/features/roam/motion';
import { appendFixes, getRecording } from '@/src/features/roam/recordingStore';
import { colors } from '@/src/theme/colors';

// Background GPS for Roam. Imported once from app/_layout so the task is
// defined at startup (required for the OS to deliver locations after the UI is
// gone). Tracking only ever starts from the foreground (user taps Start), so
// "While using the app" permission is enough on both platforms: Android runs a
// foreground service with a notification, iOS uses the location background
// mode with the blue indicator. No "Allow all the time" is requested.

export const ROAM_LOCATION_TASK = 'fitnyx-roam-location';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

type LocationTaskData = { locations?: Location.LocationObject[] };

if (supported && !TaskManager.isTaskDefined(ROAM_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(ROAM_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await drainRoamControls();
    const meta = await getRecording();
    const latestMs = Math.max(...data.locations.map((l) => l.timestamp));
    const stepSample = meta && !meta.finishedAtMs ? await readStepSample(meta.startedAtMs, latestMs) : undefined;
    await appendFixes(
      data.locations.map((l) => ({
        lat: l.coords.latitude,
        lng: l.coords.longitude,
        timestampMs: l.timestamp,
        accuracy: l.coords.accuracy,
        speed: l.coords.speed,
        course: l.coords.heading,
        altitude: l.coords.altitude,
      })),
      stepSample,
    );
    await syncRoamNotification();
  });
}

export type PermissionResult = 'granted' | 'denied' | 'blocked' | 'unsupported';

/** Asks for "While using the app" location. 'blocked' = must go to Settings. */
export async function requestRoamPermission(): Promise<PermissionResult> {
  if (!supported) return 'unsupported';
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  const asked = await Location.requestForegroundPermissionsAsync();
  if (asked.granted) return 'granted';
  return asked.canAskAgain ? 'denied' : 'blocked';
}

/**
 * `force` re-registers even when the task looks started: after the app is
 * killed, Android restores the task registration but not its foreground
 * service, so fixes would stop the moment the app leaves the screen.
 */
export async function startLocationUpdates(type: ActivityType, force = false): Promise<void> {
  if (!supported) throw new Error('Roam needs the FitNyx app on iOS or Android');
  if (!force && (await Location.hasStartedLocationUpdatesAsync(ROAM_LOCATION_TASK))) return;
  await Location.startLocationUpdatesAsync(ROAM_LOCATION_TASK, {
    // Cycling covers ground fast enough to need the most precise fixes.
    accuracy: type === 'cycle' ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
    timeInterval: 2000, // Android: target one fix every 2 s
    distanceInterval: 3, // metres; matches the jitter threshold in geo.ts
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false, // iOS must not pause mid-run
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FITNYX ROAM',
      notificationBody: 'Finding your stride · Connecting to GPS',
      notificationColor: colors.dark.primary,
    },
  });
  await startMotionTracking();
}

export async function stopLocationUpdates(): Promise<void> {
  if (!supported) return;
  if (await Location.hasStartedLocationUpdatesAsync(ROAM_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ROAM_LOCATION_TASK);
  }
  await stopMotionTracking();
}
