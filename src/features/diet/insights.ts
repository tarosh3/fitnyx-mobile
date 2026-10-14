import type { DietDayTotals } from '@/src/lib/api/diet';
import { dateFromKey, macroSplit, type Macros } from './model';

export interface DietInsights {
  /** Finished days with at least one log (today is still in progress, so excluded). */
  loggedDays: number;
  avgKcal: number | null;
  pctOfGoal: number | null;
  avgProtein: number | null;
  split: { protein: number; carbs: number; fat: number } | null;
  targetSplit: { protein: number; carbs: number; fat: number } | null;
  /** Saturday/Sunday averaged over 110 % of goal. */
  weekendHigh: { avgKcal: number; pctOver: number } | null;
  /** Protein on rest days at least 15 g below training days. */
  restDayProtein: { rest: number; training: number } | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function analyzeDays(days: DietDayTotals[], goal: Macros | null, today: string): DietInsights {
  const done = days.filter((d) => d.meals > 0 && d.date !== today);
  const avgKcal = done.length ? Math.round(avg(done.map((d) => d.kcal))) : null;
  const avgProtein = done.length ? Math.round(avg(done.map((d) => d.protein_g))) : null;

  const weekend = done.filter((d) => [0, 6].includes(dateFromKey(d.date).getDay()));
  const weekendAvg = avg(weekend.map((d) => d.kcal));
  const weekendHigh = goal && weekend.length && weekendAvg > goal.kcal * 1.1
    ? { avgKcal: Math.round(weekendAvg), pctOver: Math.round((weekendAvg / goal.kcal - 1) * 100) }
    : null;

  const training = done.filter((d) => d.trained);
  const rest = done.filter((d) => !d.trained);
  const trainingP = avg(training.map((d) => d.protein_g));
  const restP = avg(rest.map((d) => d.protein_g));
  const restDayProtein = training.length && rest.length && trainingP - restP >= 15
    ? { rest: Math.round(restP), training: Math.round(trainingP) }
    : null;

  const sum = done.reduce((t, d) => ({ protein: t.protein + d.protein_g, carbs: t.carbs + d.carbs_g, fat: t.fat + d.fat_g }), { protein: 0, carbs: 0, fat: 0 });

  return {
    loggedDays: done.length,
    avgKcal,
    pctOfGoal: avgKcal !== null && goal ? Math.round((avgKcal / goal.kcal) * 100) : null,
    avgProtein,
    split: macroSplit(sum),
    targetSplit: goal ? macroSplit(goal) : null,
    weekendHigh,
    restDayProtein,
  };
}
