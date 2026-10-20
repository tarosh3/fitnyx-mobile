import type { DietFoodItem, DietPlan } from '@/src/lib/api';
import type { DietLog, DietLogItem, Food, MealSlot, RecentFood } from '@/src/lib/api/diet';
import type { Goals } from '@/src/lib/api/goals';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PlanAlternative {
  title: string;
  desc: string;
  veg: boolean | null;
  /** Null on plans generated before alternatives carried nutrition. */
  macros: Macros | null;
}

export interface PlanMeal {
  index: number;
  label: string;
  slot: MealSlot;
  time: string;
  title: string;
  desc: string;
  veg: boolean | null;
  macros: Macros;
  ingredients: { name: string; qty: string; kcal: number | null }[];
  steps: string[];
  alternatives: PlanAlternative[];
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** "150g" / 150 / "150 g" → 150; anything else → 0. */
export function grams(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function goalsFromPlan(plan: DietPlan | null): Macros | null {
  const d = plan?.plan_data;
  if (!d || !(d.total_calories > 0)) return null;
  return { kcal: d.total_calories, protein: grams(d.macros?.protein), carbs: grams(d.macros?.carbs), fat: grams(d.macros?.fats) };
}

/**
 * The user's own calorie / protein goals replace the plan's; carbs and fat
 * split what's left in the plan's carb:fat proportion (as the backend's
 * fitplan.ComputeTargets does with the same goals).
 */
export function withDietGoals(base: Macros | null, goals: Goals | null | undefined): Macros | null {
  if (!base || !goals || (!goals.diet_kcal && !goals.diet_protein_g)) return base;
  const kcal = goals.diet_kcal || base.kcal;
  const protein = goals.diet_protein_g || base.protein;
  const carbE = base.carbs * 4;
  const fatE = base.fat * 9;
  const carbShare = carbE + fatE > 0 ? carbE / (carbE + fatE) : 0.6;
  const rest = Math.max(kcal - protein * 4, 0);
  return { kcal, protein, carbs: Math.round((rest * carbShare) / 4), fat: Math.round((rest * (1 - carbShare)) / 9) };
}

/** Plan meal names are free text ("Mid-Morning", "Evening Snack"); logs use four slots. */
export function slotForMeal(name: string): MealSlot {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return 'breakfast';
  if (n.includes('lunch')) return 'lunch';
  if (n.includes('dinner') || n.includes('supper')) return 'dinner';
  return 'snack';
}

export const SLOT_LABELS: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** The slot a meal logged at this hour most likely belongs to. */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

function itemTitle(item: DietFoodItem | string): string {
  return (typeof item === 'string' ? item : item.dish ?? '').trim();
}

const COMPOSITION_ORDER = ['base', 'protein', 'veggies', 'extras', 'flavor', 'fat'] as const;
/** Placeholders the model sometimes writes instead of omitting a key. */
const EMPTY_VALUE = /^(none|n\/?a|nil|null|-+|—)$/i;

/** "rolled oats • paneer" composition values, main ingredients first → "Rolled oats, paneer, …". */
function itemDesc(item: DietFoodItem | string | undefined): string {
  if (!item || typeof item === 'string') return '';
  const comp = (item.composition ?? {}) as Record<string, string | undefined>;
  const parts = COMPOSITION_ORDER.map((k) => comp[k])
    .flatMap((v) => String(v ?? '').split('•'))
    .map((v) => v.trim())
    .filter((v) => v && !EMPTY_VALUE.test(v));
  const text = parts.length ? parts.join(', ') : (item.ingredients ?? []).join(', ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function macrosOf(m: { calories?: number; macros?: { p: string; c: string; f: string } }): Macros | null {
  if (!(typeof m.calories === 'number' && m.calories >= 0) || !m.macros) return null;
  return { kcal: m.calories, protein: grams(m.macros.p), carbs: grams(m.macros.c), fat: grams(m.macros.f) };
}

export function planMeals(plan: DietPlan | null): PlanMeal[] {
  return (plan?.plan_data?.meals ?? []).map((m, index) => {
    const items = m.items ?? [];
    const title = items.map(itemTitle).filter(Boolean).join(' + ') || m.name;
    return {
      index,
      label: m.name,
      slot: slotForMeal(m.name),
      time: m.time ?? '',
      title,
      desc: itemDesc(items[0]),
      veg: typeof m.veg === 'boolean' ? m.veg : null,
      macros: macrosOf(m) ?? { kcal: m.calories ?? 0, protein: 0, carbs: 0, fat: 0 },
      ingredients: (m.ingredients ?? []).map((i) => ({ name: i.name, qty: i.qty ?? '', kcal: typeof i.kcal === 'number' ? i.kcal : null })),
      steps: m.steps ?? [],
      alternatives: (m.alternatives ?? []).map((a) => ({
        title: itemTitle(a),
        desc: itemDesc(a),
        veg: typeof a !== 'string' && typeof a.veg === 'boolean' ? a.veg : null,
        macros: typeof a === 'string' ? null : macrosOf(a),
      })).filter((a) => a.title),
    };
  });
}

export function sumLogs(logs: Pick<DietLog, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): Macros {
  return logs.reduce((t, l) => ({ kcal: t.kcal + l.kcal, protein: t.protein + l.protein_g, carbs: t.carbs + l.carbs_g, fat: t.fat + l.fat_g }), ZERO);
}

/** Plan meals already logged that day (also when swapped for an alternative), by meal index. */
export function loggedPlanMeals(logs: DietLog[]): Map<number, DietLog> {
  const out = new Map<number, DietLog>();
  for (const l of logs) if (l.source === 'plan' && l.plan_meal_index !== null) out.set(l.plan_meal_index, l);
  return out;
}

export function nextMealIndex(meals: PlanMeal[], logged: Map<number, DietLog>): number | null {
  return meals.find((m) => !logged.has(m.index))?.index ?? null;
}

export type DayStatus = 'hit' | 'over' | 'under' | 'none';

/** Within ±10 % of the calorie goal counts as on target. */
export function dayStatus(kcal: number, meals: number, goalKcal: number): DayStatus {
  if (meals === 0 || goalKcal <= 0) return 'none';
  const ratio = kcal / goalKcal;
  if (ratio > 1.1) return 'over';
  if (ratio < 0.9) return 'under';
  return 'hit';
}

export function scaleMacros(m: Macros, k: number): Macros {
  return { kcal: Math.round(m.kcal * k), protein: Math.round(m.protein * k), carbs: Math.round(m.carbs * k), fat: Math.round(m.fat * k) };
}

/** A planned meal (or its alternative) as a log item; portion = servings eaten. */
export function planLogItem(meal: PlanMeal, portion: number, alt?: PlanAlternative): DietLogItem {
  const m = alt?.macros ?? meal.macros;
  return {
    food_id: null,
    name: alt?.title ?? meal.title,
    portion_label: '1 serving',
    qty: portion,
    kcal: m.kcal,
    protein_g: m.protein,
    carbs_g: m.carbs,
    fat_g: m.fat,
    is_veg: (alt ? alt.veg : meal.veg) ?? null,
  };
}

export function foodLogItem(f: Food | RecentFood, qty: number): DietLogItem {
  return {
    food_id: 'id' in f ? f.id : f.food_id,
    name: f.name,
    portion_label: f.portion_label,
    qty,
    kcal: f.kcal,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    is_veg: f.is_veg,
  };
}

export function itemsTotal(items: DietLogItem[]): Macros {
  return items.reduce((t, i) => ({
    kcal: t.kcal + i.kcal * i.qty, protein: t.protein + i.protein_g * i.qty, carbs: t.carbs + i.carbs_g * i.qty, fat: t.fat + i.fat_g * i.qty,
  }), ZERO);
}

/** How far the whole day's plan falls short of the protein goal (≥10 g), else null. */
export function planProteinShortfall(meals: PlanMeal[], goal: Macros | null): number | null {
  if (!goal || goal.protein <= 0 || meals.every((m) => m.macros.protein === 0)) return null;
  const short = Math.round(goal.protein - meals.reduce((t, m) => t + m.macros.protein, 0));
  return short >= 10 ? short : null;
}

export function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '±0';
}

/** Share of calories from protein / carbs / fat, in whole percent summing to 100. */
export function macroSplit(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): { protein: number; carbs: number; fat: number } | null {
  const p = m.protein * 4, c = m.carbs * 4, f = m.fat * 9;
  const total = p + c + f;
  if (total <= 0) return null;
  const protein = Math.round((p / total) * 100), carbs = Math.round((c / total) * 100);
  return { protein, carbs, fat: 100 - protein - carbs };
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// ---------- dates (local YYYY-MM-DD) ----------

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The n dates ending at `end` (inclusive), oldest first. */
export function lastDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}
