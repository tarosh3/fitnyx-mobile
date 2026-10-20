import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { Plan } from '@/src/lib/api/plan';

const mockReplace = jest.fn();
const mockStart = jest.fn(async () => ({}));
const mockToast = jest.fn();
let mockParams: { welcome?: string } = {};
let mockPlan: { data: Plan | null; failed: boolean; refresh: jest.Mock } = { data: null, failed: false, refresh: jest.fn() };

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => false, canDismiss: () => false, dismissAll: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/features/workouts/ui/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../data', () => ({
  usePlan: () => mockPlan,
  useStartStarterProgram: () => ({ start: mockStart, busy: false }),
}));
jest.mock('../reminder', () => ({ hasPlanReminder: async () => false, enablePlanReminder: jest.fn(), disablePlanReminder: jest.fn() }));

import { PlanScreen } from '../PlanScreen';

function plan(over: Partial<Plan> = {}): Plan {
  return {
    missing: [],
    targets: { bmr: 1749, tdee: 2710, calories: 2210, adjustment_kcal: -500, protein_g: 160, carbs_g: 243, fat_g: 66, water_ml: 2800, burn_per_session_kcal: 280, burn_weekly_kcal: 840 },
    schedule: { days_per_week: 3, session_min: 40, preferred_days: ['mon', 'wed', 'fri'], preferred_time: 'evening', reminder_hour: 18, reminder_minute: 30, split: 'full_body', days_chosen: false },
    guidance: { avoid_moves: ['Jump squats, jump lunges and burpees'], safe_moves: ['Leg curls'], avoid_foods: ['Sugary drinks'], eat_more: ['Protein at every meal'] },
    today: { date: '2026-10-21', weekday: 'wed', training_day: true },
    starter_program: {
      title: 'Starter Plan · Full Body', description: '3 days a week, about 40 minutes, built for fat loss in the gym.', goal: 'weight_loss',
      days: [{ title: 'Full Body A', notes: 'Warm up for 5 minutes first.', estimated_duration_min: 40, exercises: [
        { exercise_uuid: 'a', title: 'Leg Press', tracking_type: 'weight_reps', target_sets: 3, target_reps: 12, target_duration_sec: null, rest_seconds: 45 },
      ] }],
    },
    starter_plan: null,
    active_plan: null,
    diet_defaults: { goal: 'weight_loss', activity_level: 'active' },
    profile: { goal: 'lose_fat', experience: 'beginner', location: 'gym', injuries: ['knee_pain'] },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

it('shows targets, schedule, the starter program and guidance', () => {
  mockPlan = { data: plan(), failed: false, refresh: jest.fn() };
  const screen = render(<PlanScreen />);
  expect(screen.getByText('2,210 kcal')).toBeTruthy();
  expect(screen.getByText('500 kcal under maintenance (2,710 kcal)')).toBeTruthy();
  expect(screen.getByText('3 workouts · 40 min each')).toBeTruthy();
  expect(screen.getByText('Starter Plan · Full Body')).toBeTruthy();
  expect(screen.getByText('3 × 12')).toBeTruthy();
  expect(screen.getByText('Jump squats, jump lunges and burpees')).toBeTruthy();
  expect(screen.getByText('Lose fat')).toBeTruthy();
});

it('starts the starter program and goes to Workouts', async () => {
  mockPlan = { data: plan(), failed: false, refresh: jest.fn() };
  const screen = render(<PlanScreen />);
  fireEvent.press(screen.getByTestId('plan-start'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/workouts'));
  expect(mockStart).toHaveBeenCalledTimes(1);
});

it('asks before replacing a different active program', () => {
  mockPlan = { data: plan({ active_plan: { id: 'p9', title: 'My split', source: 'user' } }), failed: false, refresh: jest.fn() };
  const screen = render(<PlanScreen />);
  fireEvent.press(screen.getByTestId('plan-start'));
  expect(mockStart).not.toHaveBeenCalled();
  expect(screen.getByText('This replaces My split.')).toBeTruthy();
});

it('after onboarding, offers to skip to Home', () => {
  mockParams = { welcome: '1' };
  mockPlan = { data: plan(), failed: false, refresh: jest.fn() };
  const screen = render(<PlanScreen />);
  fireEvent.press(screen.getByTestId('plan-later'));
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('asks for body stats when targets are missing, and handles offline', () => {
  mockPlan = { data: plan({ targets: null, missing: ['weight', 'dob'] }), failed: false, refresh: jest.fn() };
  const screen = render(<PlanScreen />);
  expect(screen.getByText(/Add your weight, date of birth/)).toBeTruthy();

  mockPlan = { data: null, failed: true, refresh: jest.fn() };
  screen.rerender(<PlanScreen />);
  expect(screen.getByText('Your plan needs a connection')).toBeTruthy();
});
