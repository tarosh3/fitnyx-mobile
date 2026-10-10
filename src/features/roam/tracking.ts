import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { ActivityType } from '@/src/features/roam/geo';
import { appendFixes } from '@/src/features/roam/recordingStore';
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
    await appendFixes(
      data.locations.map((l) => ({
        lat: l.coords.latitude,
        lng: l.coords.longitude,
        timestampMs: l.timestamp,
        accuracy: l.coords.accuracy,
      })),
    );
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

export async function startLocationUpdates(type: ActivityType): Promise<void> {
  if (!supported) throw new Error('Roam needs the FitNyx app on iOS or Android');
  if (await Location.hasStartedLocationUpdatesAsync(ROAM_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(ROAM_LOCATION_TASK, {
    // Cycling covers ground fast enough to need the most precise fixes.
    accuracy: type === 'cycle' ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
    timeInterval: 2000, // Android: target one fix every 2 s
    distanceInterval: 3, // metres; matches the jitter threshold in geo.ts
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false, // iOS must not pause mid-run
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Roam in progress',
      notificationBody: 'FitNyx is recording your route. Tap to return.',
      notificationColor: colors.dark.primary,
    },
  });
}

export async function stopLocationUpdates(): Promise<void> {
  if (!supported) return;
  if (await Location.hasStartedLocationUpdatesAsync(ROAM_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ROAM_LOCATION_TASK);
  }
}
