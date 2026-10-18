import { requireOptionalNativeModule } from 'expo';

// Native side: ios/RoamMotionModule.swift, android/.../RoamMotionModule.kt.
// Null where the module isn't built in (web export, Jest, an older dev build).
interface RoamMotionNative {
  /** iOS: steps between two times (ms since epoch); null without access. Android: always null. */
  getStepCount(fromMs: number, toMs: number): Promise<number | null>;
  /** Android: latest since-boot step counter seen since startTracking; iOS: always null. */
  readStepCounter(): Promise<number | null>;
  /** [startMs, endMs] periods the phone was confident it was in a vehicle. */
  getVehicleWindows(fromMs: number, toMs: number): Promise<[number, number][]>;
  /** Android: starts the step listener and activity transitions. iOS: no-op. */
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
}

export const RoamMotion = requireOptionalNativeModule<RoamMotionNative>('RoamMotion');
