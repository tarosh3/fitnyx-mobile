import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockSave = jest.fn();
let mockGoals: Record<string, number | null> | null = null;
let mockDay = { distanceM: 0, kcal: 0, steps: 0 };
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'goals-user' } }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/features/goals/data', () => ({
  useGoals: () => ({ data: mockGoals, save: mockSave }),
  useTodayActivity: () => ({ day: mockDay }),
}));

import { TodayGoalsCard } from '../ui/TodayGoalsCard';

const goals = (g: Partial<Record<string, number | null>>) =>
  ({ daily_distance_m: null, daily_burn_kcal: null, daily_steps: null, diet_kcal: null, diet_protein_g: null, weight_kg: 70, ...g });

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue({});
  mockDay = { distanceM: 0, kcal: 0, steps: 0 };
});

it('invites setting a goal, and saves the ones switched on', async () => {
  mockGoals = goals({});
  render(<TodayGoalsCard />);
  fireEvent.press(screen.getByText('Set a daily goal'));
  fireEvent(screen.getByLabelText('Distance goal'), 'valueChange', true);
  fireEvent.press(screen.getByLabelText('Distance 10 km'));
  fireEvent.press(screen.getByTestId('goals-save'));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(mockSave).toHaveBeenCalledWith({ daily_distance_m: 10000, daily_burn_kcal: null, daily_steps: null });
});

it('shows today against each goal', () => {
  mockGoals = goals({ daily_distance_m: 5000, daily_burn_kcal: 400 });
  mockDay = { distanceM: 5200, kcal: 180, steps: 0 };
  render(<TodayGoalsCard />);
  expect(screen.getByText('1 of 2 reached')).toBeOnTheScreen();
  expect(screen.getByLabelText('Distance: 5.2 km of 5 km, goal reached')).toBeOnTheScreen();
  expect(screen.getByLabelText('Calories: 180 kcal of 400 kcal')).toBeOnTheScreen();
});

it('renders nothing before goals load', () => {
  mockGoals = null;
  render(<TodayGoalsCard />);
  expect(screen.queryByTestId('home-goals-card')).not.toBeOnTheScreen();
});
