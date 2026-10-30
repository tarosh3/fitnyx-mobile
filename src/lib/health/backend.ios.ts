import type { HealthBackend, HealthWorkout, HealthWorkoutKind, ReadinessDay } from './types';

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
  ): Promise<{
    sumQuantity?: { quantity: number };
    averageQuantity?: { quantity: number };
    maximumQuantity?: { quantity: number };
  }>;
  queryCategorySamples(
    identifier: string,
    options?: { from?: Date; to?: Date },
  ): Promise<Array<{ value: number; startDate: string | Date; endDate: string | Date }>>;
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
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate';

// Readiness inputs (all wearable-sourced).
const HRV_SDNN = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate';
const SLEEP_ANALYSIS = 'HKCategoryTypeIdentifierSleepAnalysis';

const SHARE_TYPES = [WORKOUT_TYPE, ACTIVE_ENERGY, DIST_WALK_RUN, DIST_CYCLE, BODY_MASS];
const READ_TYPES = [STEP_COUNT, ACTIVE_ENERGY, HEART_RATE, HRV_SDNN, RESTING_HR, SLEEP_ANALYSIS];

// HKCategoryValueSleepAnalysis values that count as asleep (not inBed=0, not awake=2).
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

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

function dayStartAgo(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function discreteAvg(identifier: string, unit: string, from: Date, to: Date): Promise<number | null> {
  try {
    const mod = hk();
    const avgOpt = mod.StatisticsOptions?.discreteAverage ?? 'discreteAverage';
    const res = await mod.queryStatisticsForQuantity(identifier, [avgOpt], { from, to, unit });
    const v = res?.averageQuantity?.quantity;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

// Sleep for the night ending on `morning`: previous 18:00 → morning 11:00.
async function sleepHoursForNight(morning: Date): Promise<number | null> {
  const from = new Date(morning);
  from.setDate(from.getDate() - 1);
  from.setHours(18, 0, 0, 0);
  const to = new Date(morning);
  to.setHours(11, 0, 0, 0);
  try {
    const samples = await hk().queryCategorySamples(SLEEP_ANALYSIS, { from, to });
    let ms = 0;
    for (const s of samples ?? []) {
      if (!ASLEEP_VALUES.has(s.value)) continue;
      ms += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    }
    return ms > 0 ? Math.round((ms / 3_600_000) * 10) / 10 : null;
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

  async readHeartRate(from: Date, to: Date) {
    try {
      const mod = hk();
      const avgOpt = mod.StatisticsOptions?.discreteAverage ?? 'discreteAverage';
      const maxOpt = mod.StatisticsOptions?.discreteMax ?? 'discreteMax';
      const res = await mod.queryStatisticsForQuantity(HEART_RATE, [avgOpt, maxOpt], {
        from,
        to,
        unit: 'count/min',
      });
      const avg = res?.averageQuantity?.quantity;
      const max = res?.maximumQuantity?.quantity;
      return {
        avg: typeof avg === 'number' ? Math.round(avg) : null,
        max: typeof max === 'number' ? Math.round(max) : null,
      };
    } catch {
      return { avg: null, max: null };
    }
  },

  async readReadinessSeries(days: number) {
    try {
      const out: ReadinessDay[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const start = dayStartAgo(i);
        const end = dayStartAgo(i - 1); // next midnight; HealthKit clamps to now
        const [hrv, rhr, sleepHours] = await Promise.all([
          discreteAvg(HRV_SDNN, 'ms', start, end),
          discreteAvg(RESTING_HR, 'count/min', start, end),
          sleepHoursForNight(start),
        ]);
        out.push({
          date: dateKey(start),
          hrvMs: hrv != null ? Math.round(hrv * 10) / 10 : null,
          restingHr: rhr != null ? Math.round(rhr) : null,
          sleepHours,
        });
      }
      return out;
    } catch {
      return [];
    }
  },
};
