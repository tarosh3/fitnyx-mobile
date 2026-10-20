import { fetchWithAuth } from '@/src/lib/api';

// Mirrors backend internal/handlers/goals_handler.go. null = no goal (diet: the plan's).
export interface Goals {
  /** Daily Roam distance, metres. */
  daily_distance_m: number | null;
  /** Daily calories burned (Roams + workouts). */
  daily_burn_kcal: number | null;
  /** Daily Roam steps. */
  daily_steps: number | null;
  /** The user's own diet goals; replace the plan's numbers when set. */
  diet_kcal: number | null;
  diet_protein_g: number | null;
  /** Latest body weight the calorie estimates use (read-only); null = none on record. */
  weight_kg: number | null;
}

export type GoalsUpdate = Partial<Omit<Goals, 'weight_kg'>>;

/** Accepted range per goal (inclusive), same as the backend's goalLimits. */
export const GOAL_LIMITS: Record<keyof GoalsUpdate, [number, number]> = {
  daily_distance_m: [100, 100000],
  daily_burn_kcal: [50, 5000],
  daily_steps: [500, 100000],
  diet_kcal: [800, 6000],
  diet_protein_g: [20, 400],
};

export async function getGoals(): Promise<Goals> {
  return fetchWithAuth('/goals');
}

/** Merges: fields left out keep their value, null clears one. */
export async function updateGoals(update: GoalsUpdate): Promise<Goals> {
  return fetchWithAuth('/goals', { method: 'PUT', body: JSON.stringify(update) });
}
