import type { HealthBackend, HealthWorkout, HealthWorkoutKind } from './types';

// Android Health Connect backend. The native SDK is lazy-`require`d so the web
// bundle and jest never pull it in (see backend.ts for the default no-op).

type Perm = { accessType: 'read' | 'write'; recordType: string };

// Minimal facade over react-native-health-connect; call shapes follow its docs.
type TimeRange = { operator: 'between'; startTime: string; endTime: string };

interface HealthConnect {
  initialize(): Promise<boolean>;
  getSdkStatus?(): Promise<number>;
  requestPermission(perms: Perm[]): Promise<Perm[]>;
  getGrantedPermissions(): Promise<Perm[]>;
  insertRecords(records: unknown[]): Promise<string[]>;
  aggregateRecord(request: { recordType: string; timeRangeFilter: TimeRange }): Promise<Record<string, unknown>>;
}

// Health Connect ExerciseType constants (stable).
const EXERCISE_TYPE: Record<HealthWorkoutKind, number> = {
  running: 56,
  walking: 79,
  cycling: 8,
  strength: 70,
  other: 0, // OTHER_WORKOUT
};

const WRITE_RECORDS = ['ExerciseSession', 'Distance', 'TotalCaloriesBurned', 'Steps', 'Weight'];
const READ_RECORDS = ['Steps', 'ActiveCaloriesBurned'];
const PERMS: Perm[] = [
  ...WRITE_RECORDS.map((recordType): Perm => ({ accessType: 'write', recordType })),
  ...READ_RECORDS.map((recordType): Perm => ({ accessType: 'read', recordType })),
];

function todayRange(): TimeRange {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { operator: 'between', startTime: start.toISOString(), endTime: new Date().toISOString() };
}

function hc(): HealthConnect {
  return require('react-native-health-connect') as unknown as HealthConnect;
}

async function ready(): Promise<boolean> {
  try {
    return await hc().initialize();
  } catch {
    return false;
  }
}

export const healthBackend: HealthBackend = {
  platformLabel: 'Health Connect',

  async isAvailable() {
    return ready();
  },

  async requestPermissions() {
    if (!(await ready())) return false;
    try {
      const granted = await hc().requestPermission(PERMS);
      return granted.some((p) => p.recordType === 'ExerciseSession' && p.accessType === 'write');
    } catch {
      return false;
    }
  },

  async hasPermissions() {
    if (!(await ready())) return false;
    try {
      const granted = await hc().getGrantedPermissions();
      return granted.some((p) => p.recordType === 'ExerciseSession' && p.accessType === 'write');
    } catch {
      return false;
    }
  },

  async saveWorkout(workout: HealthWorkout) {
    if (!(await ready())) return;
    const startTime = workout.start.toISOString();
    const endTime = workout.end.toISOString();
    const records: unknown[] = [
      { recordType: 'ExerciseSession', startTime, endTime, exerciseType: EXERCISE_TYPE[workout.kind] },
    ];
    if (workout.distanceM) {
      records.push({ recordType: 'Distance', startTime, endTime, distance: { value: workout.distanceM, unit: 'meters' } });
    }
    if (workout.energyKcal) {
      records.push({ recordType: 'TotalCaloriesBurned', startTime, endTime, energy: { value: workout.energyKcal, unit: 'kilocalories' } });
    }
    await hc().insertRecords(records);
  },

  async saveWeightKg(kg: number, when: Date) {
    if (!(await ready())) return;
    await hc().insertRecords([
      { recordType: 'Weight', time: when.toISOString(), weight: { value: kg, unit: 'kilograms' } },
    ]);
  },

  async readTodaySteps() {
    if (!(await ready())) return null;
    try {
      const res = await hc().aggregateRecord({ recordType: 'Steps', timeRangeFilter: todayRange() });
      const count = (res as { COUNT_TOTAL?: number }).COUNT_TOTAL;
      return typeof count === 'number' ? count : null;
    } catch {
      return null;
    }
  },

  async readTodayActiveEnergyKcal() {
    if (!(await ready())) return null;
    try {
      const res = await hc().aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: todayRange() });
      const energy = (res as { ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number } }).ACTIVE_CALORIES_TOTAL;
      return typeof energy?.inKilocalories === 'number' ? energy.inKilocalories : null;
    } catch {
      return null;
    }
  },
};
