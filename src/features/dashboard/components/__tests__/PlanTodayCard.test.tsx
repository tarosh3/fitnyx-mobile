import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockCacheSet = jest.fn<Promise<void>, unknown[]>(async () => {});
const mockUser = { id: 'plan-user' };
let mockTrainingDay = true;
let mockHasPlan = true;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/src/features/plan/data', () => ({ usePlan: () => ({ data: mockHasPlan ? {
  targets: { calories: 2210, protein_g: 160, burn_per_session_kcal: 280 },
  today: { training_day: mockTrainingDay }, schedule: { session_min: 40 },
} : null }) }));
jest.mock('@/src/lib/cache', () => ({
  cacheGetStale: async () => false,
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  cacheKeys: { planIntroDismissed: (id: string) => `intro:${id}` },
  cacheTTL: { DAY: 86400 },
}));

import { PlanTodayCard } from '../PlanTodayCard';

beforeEach(() => { jest.clearAllMocks(); mockTrainingDay = true; mockHasPlan = true; });

it('keeps live targets and plan navigation, and dismisses the intro without opening the plan', async () => {
  const screen = render(<PlanTodayCard />);
  await waitFor(() => expect(screen.getByTestId('home-plan-dismiss')).toBeTruthy());
  expect(screen.getByText('2,210 kcal')).toBeTruthy();
  expect(screen.getByText('160 g')).toBeTruthy();
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByTestId('home-plan-dismiss'), { stopPropagation });
  expect(stopPropagation).toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockCacheSet).toHaveBeenCalledWith('intro:plan-user', true, 86400 * 365);
  expect(screen.queryByTestId('home-plan-dismiss')).toBeNull();
  fireEvent.press(screen.getByTestId('home-plan-card'));
  expect(mockPush).toHaveBeenCalledWith('/plan');
});

it('shows recovery instead of an exercise burn target on a rest day', async () => {
  mockTrainingDay = false;
  const screen = render(<PlanTodayCard />);
  await waitFor(() => expect(screen.getByTestId('home-plan-dismiss')).toBeTruthy());
  expect(screen.getByText('Rest day')).toBeTruthy();
  expect(screen.getByText('Recover')).toBeTruthy();
  expect(screen.queryByText('~280 kcal')).toBeNull();
});

it('does not invent targets before a plan is available', async () => {
  mockHasPlan = false;
  const screen = render(<PlanTodayCard />);
  await waitFor(() => expect(screen.queryByTestId('home-plan-card')).toBeNull());
});
