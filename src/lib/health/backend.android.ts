import type { HealthBackend, HealthWorkout, HealthWorkoutKind, ReadinessDay } from './types';

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
  readRecords(recordType: string, options: { timeRangeFilter: TimeRange }): Promise<{ records: Record<string, unknown>[] }>;
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
const READ_RECORDS = ['Steps', 'ActiveCaloriesBurned', 'HeartRate', 'HeartRateVariabilityRmssd', 'RestingHeartRate', 'SleepSession'];

function rangeBetween(from: Date, to: Date): TimeRange {
  return { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() };
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

async function avgRecords(recordType: string, field: string, from: Date, to: Date): Promise<number | null> {
  try {
    const { records } = await hc().readRecords(recordType, { timeRangeFilter: rangeBetween(from, to) });
    const vals = (records ?? []).map((r) => r[field]).filter((v): v is number => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
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
    const { records } = await hc().readRecords('SleepSession', { timeRangeFilter: rangeBetween(from, to) });
    let ms = 0;
    for (const r of records ?? []) {
      const s = r.startTime as string | undefined;
      const e = r.endTime as string | undefined;
      if (s && e) ms += new Date(e).getTime() - new Date(s).getTime();
    }
    return ms > 0 ? Math.round((ms / 3_600_000) * 10) / 10 : null;
  } catch {
    return null;
  }
}
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

  async readHeartRate(from: Date, to: Date) {
    if (!(await ready())) return { avg: null, max: null };
    try {
      const res = (await hc().aggregateRecord({
        recordType: 'HeartRate',
        timeRangeFilter: rangeBetween(from, to),
      })) as { BPM_AVG?: number; BPM_MAX?: number };
      return {
        avg: typeof res.BPM_AVG === 'number' ? Math.round(res.BPM_AVG) : null,
        max: typeof res.BPM_MAX === 'number' ? Math.round(res.BPM_MAX) : null,
      };
    } catch {
      return { avg: null, max: null };
    }
  },

  async readReadinessSeries(days: number) {
    if (!(await ready())) return [];
    try {
      const out: ReadinessDay[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const start = dayStartAgo(i);
        const end = dayStartAgo(i - 1);
        const [hrv, rhr, sleepHours] = await Promise.all([
          avgRecords('HeartRateVariabilityRmssd', 'heartRateVariabilityMillis', start, end),
          avgRecords('RestingHeartRate', 'beatsPerMinute', start, end),
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
