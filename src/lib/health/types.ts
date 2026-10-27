/**
 * Platform-neutral health model. The iOS (Apple Health / HealthKit) and Android
 * (Health Connect) backends implement `HealthBackend`; everything else in the
 * app speaks these types, never a vendor SDK directly.
 */

export type HealthWorkoutKind = 'running' | 'walking' | 'cycling' | 'strength' | 'other';

export interface HealthWorkout {
  kind: HealthWorkoutKind;
  start: Date;
  end: Date;
  /** Distance in metres (Roam only). */
  distanceM?: number;
  /** Energy burned in kilocalories, when known. */
  energyKcal?: number;
}

export interface HealthBackend {
  /** User-facing name of the store, e.g. "Apple Health" / "Health Connect"; '' when unavailable. */
  readonly platformLabel: string;
  /** Whether a health store exists on this device/platform. */
  isAvailable(): Promise<boolean>;
  /** Prompt for the write permissions FitNyx needs. Resolves true if (likely) granted. */
  requestPermissions(): Promise<boolean>;
  /** Best-effort check that the needed write permissions are granted. */
  hasPermissions(): Promise<boolean>;
  /** Write one workout/activity. No-op / throws caught by the caller. */
  saveWorkout(workout: HealthWorkout): Promise<void>;
  /** Write a body-weight sample (kilograms). */
  saveWeightKg(kg: number, when: Date): Promise<void>;
}
