import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutPlan, WorkoutPlanDay, WorkoutDayExercise } from '@/src/lib/api/workoutPlans';

const KEYS = {
  plans: 'fitnyx-db:plans',
  days: 'fitnyx-db:days',
  exercises: 'fitnyx-db:exercises',
} as const;

type PlansStore = Record<string, WorkoutPlan>;
type DaysStore = Record<string, WorkoutPlanDay[]>;
type ExercisesStore = Record<string, WorkoutDayExercise[]>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function cachePlan(plan: WorkoutPlan): Promise<void> {
  const plans = await readJson<PlansStore>(KEYS.plans, {});
  plans[plan.id] = plan;
  await writeJson(KEYS.plans, plans);
}

export async function getCachedPlan(planId: string): Promise<WorkoutPlan | null> {
  const plans = await readJson<PlansStore>(KEYS.plans, {});
  return plans[planId] ?? null;
}

export async function cachePlanDays(planId: string, days: WorkoutPlanDay[]): Promise<void> {
  const allDays = await readJson<DaysStore>(KEYS.days, {});
  allDays[planId] = days;
  await writeJson(KEYS.days, allDays);
}

export async function getCachedPlanDays(planId: string): Promise<WorkoutPlanDay[] | null> {
  const allDays = await readJson<DaysStore>(KEYS.days, {});
  return allDays[planId] ?? null;
}

export async function cacheDayExercises(dayId: string, exercises: WorkoutDayExercise[]): Promise<void> {
  const allExercises = await readJson<ExercisesStore>(KEYS.exercises, {});
  allExercises[dayId] = exercises;
  await writeJson(KEYS.exercises, allExercises);
}

export async function getCachedDayExercises(dayId: string): Promise<WorkoutDayExercise[] | null> {
  const allExercises = await readJson<ExercisesStore>(KEYS.exercises, {});
  return allExercises[dayId] ?? null;
}
