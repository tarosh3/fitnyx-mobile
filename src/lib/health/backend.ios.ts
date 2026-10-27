import type { HealthBackend, HealthWorkout, HealthWorkoutKind } from './types';

// Apple Health (HealthKit) backend. The native SDK is lazy-`require`d so the web
// bundle and jest never pull it in (see backend.ts for the default no-op).

// Minimal facade over @kingstinct/react-native-healthkit — typed here so this
// file stays decoupled from the library's Nitro-generated types. The call
// shapes follow the library's documented API.
interface HealthKit {
  isHealthDataAvailable(): boolean;
  requestAuthorization(req: { toShare: string[]; toRead: string[] }): Promise<boolean>;
  authorizationStatusFor(type: string): number;
  saveQuantitySample(
    identifier: string,
    unit: string,
    value: number,
    start: Date,
    end: Date,
  ): Promise<unknown>;
  saveWorkoutSample(
    activityType: string,
    quantities: unknown[],
    start: Date,
    end: Date,
    totals?: { distance?: number; energyBurned?: number },
  ): Promise<unknown>;
  queryStatisticsForQuantity(
    identifier: string,
    statistics: string[],
    options?: { from?: Date; to?: Date; unit?: string },
  ): Promise<{ sumQuantity?: { quantity: number } }>;
  StatisticsOptions?: Record<string, string>;
}

// HKAuthorizationStatus.sharingAuthorized (stable Apple enum).
const SHARING_AUTHORIZED = 2;

const WORKOUT_TYPE = 'HKWorkoutTypeIdentifier';
const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const DIST_WALK_RUN = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const DIST_CYCLE = 'HKQuantityTypeIdentifierDistanceCycling';

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount';

const SHARE_TYPES = [WORKOUT_TYPE, ACTIVE_ENERGY, DIST_WALK_RUN, DIST_CYCLE, BODY_MASS];
const READ_TYPES = [STEP_COUNT, ACTIVE_ENERGY];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function sumToday(identifier: string, unit: string): Promise<number | null> {
  try {
    const mod = hk();
    const cumulativeSum = mod.StatisticsOptions?.cumulativeSum ?? 'cumulativeSum';
    const res = await mod.queryStatisticsForQuantity(identifier, [cumulativeSum], {
      from: startOfToday(),
      to: new Date(),
      unit,
    });
    const value = res?.sumQuantity?.quantity;
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

const ACTIVITY_TYPE: Record<HealthWorkoutKind, string> = {
  running: 'Running',
  walking: 'Walking',
  cycling: 'Cycling',
  strength: 'TraditionalStrengthTraining',
  other: 'Other',
};

function hk(): HealthKit {
  return require('@kingstinct/react-native-healthkit') as unknown as HealthKit;
}

export const healthBackend: HealthBackend = {
  platformLabel: 'Apple Health',

  async isAvailable() {
    try {
      return hk().isHealthDataAvailable();
    } catch {
      return false;
    }
  },

  async requestPermissions() {
    try {
      return await hk().requestAuthorization({ toShare: SHARE_TYPES, toRead: READ_TYPES });
    } catch {
      return false;
    }
  },

  async hasPermissions() {
    try {
      // HealthKit only reveals *write* (share) status, which is all we need.
      return hk().authorizationStatusFor(WORKOUT_TYPE) === SHARING_AUTHORIZED;
    } catch {
      return false;
    }
  },

  async saveWorkout(workout: HealthWorkout) {
    await hk().saveWorkoutSample(ACTIVITY_TYPE[workout.kind], [], workout.start, workout.end, {
      distance: workout.distanceM,
      energyBurned: workout.energyKcal,
    });
  },

  async saveWeightKg(kg: number, when: Date) {
    await hk().saveQuantitySample(BODY_MASS, 'kg', kg, when, when);
  },

  async readTodaySteps() {
    return sumToday(STEP_COUNT, 'count');
  },

  async readTodayActiveEnergyKcal() {
    return sumToday(ACTIVE_ENERGY, 'kcal');
  },
};
