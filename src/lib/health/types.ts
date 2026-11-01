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
  /** Total steps today (device-local midnight → now); null if unavailable. */
  readTodaySteps(): Promise<number | null>;
  /** Active energy burned today in kcal; null if unavailable. */
  readTodayActiveEnergyKcal(): Promise<number | null>;
  /** Average + peak heart rate (bpm) over a time range; nulls if unavailable. */
  readHeartRate(from: Date, to: Date): Promise<HeartRateStats>;
  /**
   * Daily readiness inputs (HRV, resting HR, sleep) for the last `days` days,
   * oldest → newest. Returns [] when unavailable or unpermitted. These come
   * from a wearable (watch/ring) feeding the store; phone-only users get nulls.
   */
  readReadinessSeries(days: number): Promise<ReadinessDay[]>;
}

/**
 * One day's readiness inputs; a field is null when the store has no sample.
 * HRV is SDNN on iOS and RMSSD on Android (different scales) — only ever
 * compared to the user's own rolling baseline, never across platforms.
 */
export interface ReadinessDay {
  /** Local date key YYYY-MM-DD; the morning these overnight values belong to. */
  date: string;
  /** Overnight heart-rate variability in milliseconds. */
  hrvMs: number | null;
  /** Resting heart rate in bpm. */
  restingHr: number | null;
  /** Hours asleep the night before. */
  sleepHours: number | null;
}

/** Heart-rate summary over a range; a field is null when unknown. */
export interface HeartRateStats {
  avg: number | null;
  max: number | null;
}

/** Today's totals read from the health store; a field is null when unknown. */
export interface HealthToday {
  steps: number | null;
  activeKcal: number | null;
}
