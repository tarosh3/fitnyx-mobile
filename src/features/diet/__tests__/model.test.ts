import type { DietPlan } from '@/src/lib/api';
import type { DietDayTotals, DietLog } from '@/src/lib/api/diet';
import { analyzeDays } from '@/src/features/diet/insights';
import {
  addDays, dayStatus, goalsFromPlan, grams, lastDays, loggedPlanMeals, macroSplit, nextMealIndex, planLogItem, planMeals,
  planProteinShortfall, signed, slotForHour, slotForMeal, sumLogs,
} from '@/src/features/diet/model';

const plan = {
  id: 'p1', user_id: 'u1', preferences: {}, created_at: '',
  plan_data: {
    summary: '', total_calories: 2000, macros: { protein: '140g', carbs: '220g', fats: '62g' },
    meals: [
      {
        name: 'Breakfast', time: '8:00 AM', calories: 450, macros: { p: '16g', c: '70g', f: '12g' },
        items: [{ dish: 'Masala Oats Bowl', composition: { fat: 'ghee', base: 'rolled oats', extras: 'None', protein: 'peanuts • milk • n/a' } }],
        veg: true, steps: ['Cook oats.'], ingredients: [{ name: 'Rolled oats', qty: '50 g', kcal: 190 }],
        alternatives: [{ dish: 'Poha Bowl', veg: true, calories: 430, macros: { p: '12g', c: '70g', f: '11g' } }, 'Upma'],
      },
      { name: 'Lunch', time: '1:00 PM', calories: 620, macros: { p: '46g', c: '70g', f: '17g' }, items: ['Chicken Rice Bowl'] },
      { name: 'Evening Snack', time: '4:30 PM', calories: 260, macros: { p: '20g', c: '26g', f: '8g' }, items: [{ dish: 'Hung Curd' }] },
      { name: 'Dinner', time: '8:00 PM', calories: 595, macros: { p: '34g', c: '56g', f: '26g' }, items: [{ dish: 'Paneer Bhurji' }, { dish: '2 Roti' }] },
    ],
  },
} as unknown as DietPlan;

const log = (over: Partial<DietLog>): DietLog => ({
  client_log_id: 'x', local_date: '2026-10-14', slot: 'lunch', source: 'food', plan_meal_index: null, name: 'x', items: [],
  kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, created_at: '', ...over,
});

describe('diet plan model', () => {
  it('parses goals and meals, including older plans without details', () => {
    expect(grams('140g')).toBe(140);
    expect(grams(12)).toBe(12);
    expect(grams('n/a')).toBe(0);
    expect(goalsFromPlan(plan)).toEqual({ kcal: 2000, protein: 140, carbs: 220, fat: 62 });
    expect(goalsFromPlan(null)).toBeNull();

    const meals = planMeals(plan);
    expect(meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    expect(meals[0]).toMatchObject({ title: 'Masala Oats Bowl', desc: 'Rolled oats, peanuts, milk, ghee', veg: true, macros: { kcal: 450, protein: 16, carbs: 70, fat: 12 } });
    expect(meals[0].alternatives).toEqual([
      { title: 'Poha Bowl', desc: '', veg: true, macros: { kcal: 430, protein: 12, carbs: 70, fat: 11 } },
      { title: 'Upma', desc: '', veg: null, macros: null },
    ]);
    expect(meals[1]).toMatchObject({ title: 'Chicken Rice Bowl', veg: null, ingredients: [], steps: [] });
    expect(meals[3].title).toBe('Paneer Bhurji + 2 Roti');
  });

  it('maps free-text meal names and hours to slots', () => {
    expect(slotForMeal('Mid-Morning')).toBe('snack');
    expect(slotForMeal('Supper')).toBe('dinner');
    expect([8, 13, 16, 21].map(slotForHour)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  it('tracks which planned meals were logged, swaps included', () => {
    const logs = [log({ source: 'plan', plan_meal_index: 0, kcal: 450, protein_g: 16 }), log({ source: 'plan', plan_meal_index: 1, name: 'Paneer Bowl', kcal: 640, protein_g: 34 }), log({ kcal: 105, protein_g: 3 })];
    const logged = loggedPlanMeals(logs);
    expect([...logged.keys()]).toEqual([0, 1]);
    expect(nextMealIndex(planMeals(plan), logged)).toBe(2);
    expect(sumLogs(logs)).toEqual({ kcal: 1195, protein: 53, carbs: 0, fat: 0 });
  });

  it('builds plan log items for a portion or an alternative', () => {
    const [breakfast] = planMeals(plan);
    expect(planLogItem(breakfast, 1.5)).toMatchObject({ name: 'Masala Oats Bowl', qty: 1.5, kcal: 450, protein_g: 16, is_veg: true });
    expect(planLogItem(breakfast, 1, breakfast.alternatives[0])).toMatchObject({ name: 'Poha Bowl', kcal: 430, protein_g: 12 });
    // No nutrition on the alternative: log it with the planned meal's values.
    expect(planLogItem(breakfast, 1, breakfast.alternatives[1])).toMatchObject({ name: 'Upma', kcal: 450, is_veg: null });
  });

  it('classifies days against the goal with a 10% band', () => {
    expect(dayStatus(0, 0, 2000)).toBe('none');
    expect(dayStatus(2150, 3, 2000)).toBe('hit');
    expect(dayStatus(2300, 4, 2000)).toBe('over');
    expect(dayStatus(1500, 2, 2000)).toBe('under');
  });

  it('flags a plan that falls short on protein', () => {
    expect(planProteinShortfall(planMeals(plan), goalsFromPlan(plan))).toBe(24);
    expect(planProteinShortfall(planMeals(plan), { kcal: 2000, protein: 120, carbs: 0, fat: 0 })).toBeNull();
  });

  it('formats and splits numbers', () => {
    expect([signed(20), signed(-12), signed(0)]).toEqual(['+20', '−12', '±0']);
    expect(macroSplit({ protein: 140, carbs: 220, fat: 62 })).toEqual({ protein: 28, carbs: 44, fat: 28 });
    expect(macroSplit({ protein: 0, carbs: 0, fat: 0 })).toBeNull();
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(lastDays('2026-10-14', 3)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
  });
});

describe('diet insights', () => {
  const day = (date: string, kcal: number, protein: number, trained = false, meals = 3): DietDayTotals =>
    ({ date, kcal, protein_g: protein, carbs_g: 200, fat_g: 60, meals, trained });
  const goal = { kcal: 2000, protein: 140, carbs: 220, fat: 62 };
  // 2026-10-10 is a Saturday.
  const days = [
    day('2026-10-08', 1940, 128, true), day('2026-10-09', 2080, 142, true), day('2026-10-10', 2420, 96),
    day('2026-10-11', 2310, 104), day('2026-10-12', 1980, 138, true), day('2026-10-13', 2260, 146, true), day('2026-10-14', 450, 16, false, 1),
  ];

  it('averages finished logged days and spots patterns', () => {
    const r = analyzeDays(days, goal, '2026-10-14');
    expect(r).toMatchObject({ loggedDays: 6, avgKcal: 2165, pctOfGoal: 108, avgProtein: 126 });
    expect(r.weekendHigh).toEqual({ avgKcal: 2365, pctOver: 18 });
    expect(r.restDayProtein).toEqual({ rest: 100, training: 139 });
    expect(r.targetSplit).toEqual({ protein: 28, carbs: 44, fat: 28 });
  });

  it('stays quiet without enough data', () => {
    const r = analyzeDays([day('2026-10-14', 450, 16), day('2026-10-13', 0, 0, false, 0)], goal, '2026-10-14');
    expect(r).toMatchObject({ loggedDays: 0, avgKcal: null, pctOfGoal: null, weekendHigh: null, restDayProtein: null, split: null });
  });
});
