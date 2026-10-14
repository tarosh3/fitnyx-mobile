import { fetchWithAuth } from '@/src/lib/api';

// Mirrors backend internal/handlers/diet_log_handler.go.

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type DietLogSource = 'plan' | 'food' | 'quick';

/** One food in a log. kcal and macros are per portion; qty is portions eaten. */
export interface DietLogItem {
  food_id: number | null;
  name: string;
  portion_label: string;
  qty: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_veg: boolean | null;
}

export interface CreateDietLogInput {
  /** Generated on the device; makes offline retries idempotent and deletes possible before sync. */
  client_log_id: string;
  local_date: string; // YYYY-MM-DD
  slot: MealSlot;
  source: DietLogSource;
  /** Required when source is 'plan' (also for a swapped alternative). */
  plan_meal_index?: number;
  name: string;
  items: DietLogItem[];
}

/** A stored log; totals are computed by the backend from the items. */
export interface DietLog extends Omit<CreateDietLogInput, 'plan_meal_index'> {
  plan_meal_index: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface DietDayTotals {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals: number;
  /** A completed workout or a saved Roam that day. */
  trained: boolean;
}

export interface DietSummary {
  from: string;
  to: string;
  days: DietDayTotals[];
  streak_days: number;
  top_foods: { name: string; count: number }[];
}

export interface Food {
  id: number;
  name: string;
  category: string;
  portion_label: string;
  portion_g: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_veg: boolean;
}

export interface RecentFood {
  food_id: number | null;
  name: string;
  portion_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_veg: boolean | null;
  count: number;
  last_logged: string;
}

export async function fetchDietLogs(date: string): Promise<{ date: string; logs: DietLog[] }> {
  return fetchWithAuth(`/diet/logs?date=${encodeURIComponent(date)}`);
}

export async function createDietLog(input: CreateDietLogInput): Promise<DietLog> {
  return fetchWithAuth('/diet/logs', { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteDietLog(clientLogId: string): Promise<void> {
  await fetchWithAuth(`/diet/logs/${encodeURIComponent(clientLogId)}`, { method: 'DELETE' });
}

export async function fetchDietSummary(from: string, to: string): Promise<DietSummary> {
  return fetchWithAuth(`/diet/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export async function searchFoods(query: string): Promise<Food[]> {
  const res = await fetchWithAuth(`/diet/foods?search=${encodeURIComponent(query)}`);
  return res?.foods ?? [];
}

export async function fetchRecentFoods(date: string): Promise<RecentFood[]> {
  const res = await fetchWithAuth(`/diet/foods/recent?date=${encodeURIComponent(date)}`);
  return res?.foods ?? [];
}
