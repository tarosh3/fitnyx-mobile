import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type WorkoutActivityDetails = { title: string; sets: number; volumeKg: number; restEnd?: number };
const empty: WorkoutActivityDetails = { title: 'Workout', sets: 0, volumeKg: 0 };
const values = new Map<string, WorkoutActivityDetails>();
const listeners = new Set<() => void>();
const key = (id: string) => `fitnyx.workout.activity-details:${id}`;
let writes = Promise.resolve();
export const subscribeWorkoutDetails = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getWorkoutDetails = (id: string) => values.get(id) ?? empty;
export async function loadWorkoutDetails(id: string) {
  if (!values.has(id)) {
    const raw = await AsyncStorage.getItem(key(id));
    if (!values.has(id) && raw) {
      try { values.set(id, { ...empty, ...JSON.parse(raw) }); listeners.forEach((fn) => fn()); } catch { /* Invalid old cache. */ }
    }
  }
  return getWorkoutDetails(id);
}
export async function updateWorkoutDetails(id: string, patch: Partial<WorkoutActivityDetails>): Promise<void> {
  await loadWorkoutDetails(id);
  const next = { ...getWorkoutDetails(id), ...patch };
  if (JSON.stringify(next) === JSON.stringify(getWorkoutDetails(id))) return writes;
  values.set(id, next);
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(key(id), JSON.stringify(next)));
  listeners.forEach((fn) => fn());
  return writes;
}
export function useWorkoutDetails(id: string) {
  return useSyncExternalStore(subscribeWorkoutDetails, () => getWorkoutDetails(id), () => empty);
}
