import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WeekCard } from '../WeekCard';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 29, 12)); });
afterEach(() => jest.useRealTimers());

it('shows an invitation instead of empty rings, even with old history', () => {
  const screen = render(<WeekCard sessions={[{ id: 'old', workout_date: '2026-10-01', total_duration_sec: 1800, total_sets: 10 }]} />);
  expect(screen.getByText('Your week starts here')).toBeOnTheScreen();
  expect(screen.queryByTestId('week-progress')).toBeNull();
  expect(screen.getByLabelText('29, today')).toBeOnTheScreen();
});

it('shows real progress after the first session and preserves history navigation', () => {
  const screen = render(<WeekCard sessions={[{ id: 'first', workout_date: '2026-10-29', total_duration_sec: 1800, total_sets: 10 }]} />);
  expect(screen.queryByTestId('week-empty')).toBeNull();
  expect(screen.getByLabelText('This week: Workouts 1/4, Minutes 30/150, Sets 10/60')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: '29, trained. Open this workout' }));
  expect(mockPush).toHaveBeenCalledWith('/workouts/history/first');
});
