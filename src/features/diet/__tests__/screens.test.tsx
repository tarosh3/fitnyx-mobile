import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { LogFoodScreen } from '@/src/features/diet/log/LogFoodScreen';
import { DietTodayScreen } from '@/src/features/diet/today/DietTodayScreen';
import { getDietPlan } from '@/src/lib/api';
import { createDietLog, fetchDietLogs, fetchDietSummary, fetchRecentFoods, searchFoods } from '@/src/lib/api/diet';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheClear } from '@/src/lib/cache';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/src/lib/water', () => ({ useWaterToday: () => ({ day: { date: '', entries: [] }, goalMl: 2500, totalMl: 750, add: jest.fn(), remove: jest.fn() }) }));
jest.mock('@/src/lib/api', () => ({ ...jest.requireActual('@/src/lib/api'), getDietPlan: jest.fn() }));
jest.mock('@/src/lib/api/diet', () => ({
  createDietLog: jest.fn(), deleteDietLog: jest.fn(), fetchDietLogs: jest.fn(), fetchDietSummary: jest.fn(),
  fetchRecentFoods: jest.fn(), searchFoods: jest.fn(),
}));

const today = localDateKey(new Date());
const plan = {
  id: 'p1', user_id: 'user-1', preferences: {}, created_at: '',
  plan_data: {
    summary: '', total_calories: 2000, macros: { protein: '140g', carbs: '220g', fats: '62g' },
    meals: [
      { name: 'Breakfast', time: '8:00 AM', calories: 450, macros: { p: '16g', c: '70g', f: '12g' }, items: [{ dish: 'Masala Oats Bowl' }] },
      { name: 'Lunch', time: '1:00 PM', calories: 620, macros: { p: '46g', c: '70g', f: '17g' }, items: [{ dish: 'Chicken Rice Bowl' }], veg: false },
      { name: 'Dinner', time: '8:00 PM', calories: 595, macros: { p: '34g', c: '56g', f: '26g' }, items: [{ dish: 'Paneer Bhurji' }] },
    ],
  },
};
const breakfastLog = {
  client_log_id: 'b1', local_date: today, slot: 'breakfast', source: 'plan', plan_meal_index: 0, name: 'Masala Oats Bowl',
  items: [{ food_id: null, name: 'Masala Oats Bowl', portion_label: '1 serving', qty: 1, kcal: 450, protein_g: 16, carbs_g: 70, fat_g: 12, is_veg: null }],
  kcal: 450, protein_g: 16, carbs_g: 70, fat_g: 12, created_at: 't',
};

beforeEach(async () => {
  await cacheClear();
  jest.clearAllMocks();
  mockParams = {};
  (getDietPlan as jest.Mock).mockResolvedValue(plan);
  (fetchDietLogs as jest.Mock).mockResolvedValue({ date: today, logs: [breakfastLog] });
  (fetchDietSummary as jest.Mock).mockResolvedValue({ from: today, to: today, days: [], streak_days: 1, top_foods: [] });
  (createDietLog as jest.Mock).mockImplementation(async (input) => ({ ...input, plan_meal_index: input.plan_meal_index ?? null, kcal: 620, protein_g: 46, carbs_g: 70, fat_g: 17, created_at: 't' }));
});

describe('diet today', () => {
  it('shows calories left and logs the next planned meal in one tap', async () => {
    const screen = render(<DietTodayScreen />);
    expect(await screen.findByText('1,550')).toBeTruthy();
    expect(screen.getByText('kcal left')).toBeTruthy();
    expect(screen.getByText('Up next')).toBeTruthy();
    // Plan has 96 g protein for a 140 g goal → Filo suggests a protein snack.
    expect(screen.getByText(/44 g under your protein goal/)).toBeTruthy();

    (fetchDietLogs as jest.Mock).mockResolvedValue({ date: today, logs: [breakfastLog, { ...breakfastLog, client_log_id: 'l1', slot: 'lunch', plan_meal_index: 1, name: 'Chicken Rice Bowl', kcal: 620, protein_g: 46 }] });
    await act(async () => { fireEvent.press(screen.getByLabelText('I ate Chicken Rice Bowl')); });

    expect(createDietLog).toHaveBeenCalledWith(expect.objectContaining({
      local_date: today, slot: 'lunch', source: 'plan', plan_meal_index: 1, name: 'Chicken Rice Bowl',
      items: [expect.objectContaining({ qty: 1, kcal: 620, protein_g: 46, is_veg: false })],
    }));
    expect(await screen.findByText('930')).toBeTruthy();
    expect(screen.getByLabelText(/Dinner at 8:00 PM: Paneer Bhurji, 595 kcal, up next/)).toBeTruthy();
  });
});

describe('diet tabs', () => {
  it('switches Today and Insights in place, and a day in the strip returns to Today', async () => {
    (fetchDietSummary as jest.Mock).mockResolvedValue({
      from: today, to: today, streak_days: 3, top_foods: [{ name: 'Dal tadka', count: 4 }],
      days: [{ date: today, kcal: 450, protein_g: 16, carbs_g: 70, fat_g: 12, meals: 1, trained: false }],
    });
    const screen = render(<DietTodayScreen />);
    expect(await screen.findByText('kcal left')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Insights' }));
    expect(await screen.findByText('Most logged')).toBeTruthy();
    expect(screen.getByText('3 days')).toBeTruthy();
    expect(screen.queryByText('kcal left')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Insights' })).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText(/^Today, .*in progress$/));
    expect(await screen.findByText('kcal left')).toBeTruthy();
    expect(screen.queryByText('Most logged')).toBeNull();
  });
});

describe('log food', () => {
  it('searches, adjusts portions and saves one log to the chosen slot', async () => {
    jest.useFakeTimers();
    mockParams = { date: today, slot: 'dinner' };
    (fetchRecentFoods as jest.Mock).mockResolvedValue([]);
    (searchFoods as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Dal tadka', category: 'dal', portion_label: '1 katori (150 g)', portion_g: 150, kcal: 180, protein_g: 9, carbs_g: 22, fat_g: 6.5, is_veg: true },
      { id: 2, name: 'Roti, whole wheat', category: 'bread', portion_label: '1 roti (40 g)', portion_g: 40, kcal: 106, protein_g: 3.4, carbs_g: 18, fat_g: 2.5, is_veg: true },
    ]);
    const screen = render(<LogFoodScreen />);
    fireEvent.changeText(screen.getByLabelText('Search foods'), 'dal');
    await act(async () => { jest.advanceTimersByTime(300); });
    jest.useRealTimers();
    expect(searchFoods).toHaveBeenCalledWith('dal');

    fireEvent.press(await screen.findByLabelText('Add Dal tadka'));
    fireEvent.press(screen.getByLabelText('Add Roti, whole wheat'));
    fireEvent.press(screen.getByLabelText('More Roti, whole wheat'));
    fireEvent.press(screen.getByLabelText('More Roti, whole wheat'));
    expect(screen.getByText('Add 2 items · 392 kcal to Dinner')).toBeTruthy();

    // A new search must not hide the selected foods or their portion controls.
    fireEvent.press(screen.getByLabelText('Clear search'));
    expect(screen.getByText('Your selection')).toBeTruthy();
    expect(screen.getByLabelText('Remove Dal tadka')).toBeTruthy();
    expect(screen.getByLabelText('More Roti, whole wheat')).toBeTruthy();
    expect(screen.getByText('Add 2 items · 392 kcal to Dinner')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByText('Add 2 items · 392 kcal to Dinner')); });
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(createDietLog).toHaveBeenCalledWith(expect.objectContaining({
      local_date: today, slot: 'dinner', source: 'food', name: 'Dal tadka, Roti, whole wheat',
      items: [expect.objectContaining({ food_id: 1, qty: 1, kcal: 180 }), expect.objectContaining({ food_id: 2, qty: 2, kcal: 106 })],
    }));
  });
});
