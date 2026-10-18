import { PermissionsAndroid, Platform } from 'react-native';

import { RoamMotion } from '@/modules/roam-motion';
import type { VehicleWindow } from '@/src/features/roam/geo';
import type { StepSample } from '@/src/features/roam/recordingStore';

// Phone motion sensors for Roam: pedometer steps and the phone's own "in a
// vehicle" detection (iOS CoreMotion, Android step counter + Activity
// Recognition). All optional — without permission or hardware every call
// resolves to "unknown" and Roam runs on GPS alone.

/** Asks for Motion & Fitness (iOS) / Physical activity (Android). Never throws. */
export async function requestMotionPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version < 29) return true;
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (Platform.OS === 'ios' && RoamMotion) {
      // CoreMotion prompts on first use: a tiny query shows the dialog.
      const now = Date.now();
      return (await RoamMotion.getStepCount(now - 1000, now)) !== null;
    }
  } catch {
    // Unknown is fine — Roam works on GPS alone.
  }
  return false;
}

export async function startMotionTracking(): Promise<void> {
  await RoamMotion?.startTracking().catch(() => undefined);
}

export async function stopMotionTracking(): Promise<void> {
  await RoamMotion?.stopTracking().catch(() => undefined);
}

/** A pedometer reading to store with a batch of fixes taken up to `atMs`. */
export async function readStepSample(startedAtMs: number, atMs: number): Promise<StepSample> {
  if (!RoamMotion) return {};
  try {
    if (Platform.OS === 'ios') return { sinceStart: await RoamMotion.getStepCount(startedAtMs, Math.max(startedAtMs, atMs)) };
    return { counter: await RoamMotion.readStepCounter() };
  } catch {
    return {};
  }
}

/** The phone's in-vehicle periods during a Roam, in seconds since its start. */
export async function readVehicleWindows(startedAtMs: number, endedAtMs: number): Promise<VehicleWindow[]> {
  if (!RoamMotion || endedAtMs <= startedAtMs) return [];
  try {
    const windows = await RoamMotion.getVehicleWindows(startedAtMs, endedAtMs);
    return windows
      .map(([a, b]): VehicleWindow => [Math.max(0, (a - startedAtMs) / 1000), (Math.min(b, endedAtMs) - startedAtMs) / 1000])
      .filter(([a, b]) => b > a);
  } catch {
    return [];
  }
}
