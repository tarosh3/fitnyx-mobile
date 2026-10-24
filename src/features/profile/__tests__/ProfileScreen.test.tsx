import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';

const mockPush = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockSummaryRefresh = jest.fn().mockResolvedValue(undefined);
const mockRoamRefresh = jest.fn().mockResolvedValue(undefined);
let mockLoading = false;
let mockFailed = false;
let mockEmpty = false;
const mockSummary = {
  lifetime: { workouts: 128, roams: 28, distance_m: 162400, volume_kg: 484600 },
  streak: { current_weeks: 5, best_weeks: 7, this_week: true },
  records: { lifts: [{ exercise_uuid: 'squat', name: 'Back squat', e1rm_kg: 125 }], efforts: [{ km: 5, sec: 1458 }], longest_roam: null, most_climb: null },
};
const mockEmptySummary = {
  lifetime: { workouts: 0, roams: 0, distance_m: 0, volume_kg: 0 },
  streak: { current_weeks: 0, best_weeks: 0, this_week: false },
  records: { lifts: [], efforts: [], longest_roam: null, most_climb: null },
};
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'one' }, userProfile: { first_name: 'Alexandria Catherine', last_name: 'Morgan', username: 'alexmorgan', bio: 'Building strength.' }, avatarUrl: null }) }));
jest.mock('@/src/providers/WorkoutOverlayProvider', () => ({ useWorkoutOverlayInset: () => 0 }));
jest.mock('@/src/hooks/useRetentionMetrics', () => ({ useRetentionMetrics: () => ({
  loading: mockLoading, error: mockFailed, level: 9, xp: 12540, nextLevelXp: 13500, levelProgress: 36, refresh: mockRefresh,
  sessions: mockEmpty || mockLoading || mockFailed ? [] : [{ id: 'w1', status: 'completed', plan_name: 'Upper body', started_at: '2026-10-22T06:00:00Z', finished_at: '2026-10-22T06:40:00Z', total_duration_sec: 2400, total_volume_kg: 4200, total_sets: 18 }],
}) }));
jest.mock('@/src/features/progress/data', () => ({
  useProgressSummary: () => ({ data: mockLoading || mockFailed ? undefined : mockEmpty ? mockEmptySummary : mockSummary, loading: mockLoading, failed: mockFailed, refetch: mockSummaryRefresh }),
  useFitnessProfile: () => ({ primary_goal: 'build_muscle', experience_level: 'intermediate', workout_location: 'gym', weekly_workout_target: 4 }),
}));
jest.mock('@/src/features/roam/useRoamActivities', () => ({ useRoamActivities: () => ({ data: { data: [] }, loading: mockLoading, error: mockFailed ? 'Unavailable' : null, refresh: mockRoamRefresh }) }));
jest.mock('@/src/features/friends/data', () => ({ useFriends: () => ({ data: { friends: [{ id: 'friend' }], incoming_count: 2 } }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }) }));

beforeEach(() => { jest.clearAllMocks(); mockLoading = false; mockFailed = false; mockEmpty = false; });

test('keeps the full identity and level progress accessible', () => {
  const screen = render(<ProfileScreen />);
  expect(screen.getByText('Alexandria Catherine Morgan').props.numberOfLines).toBeUndefined();
  expect(screen.getByText('@alexmorgan')).toBeTruthy();
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 36 });
});

test('preserves profile, settings, training, requests, and Arena entry points', () => {
  const screen = render(<ProfileScreen />);
  for (const [id, route] of [['edit-profile', '/profile'], ['open-settings', '/settings'], ['open-fitness-profile', '/fitness-profile'], ['open-friends', '/friends?tab=requests'], ['open-arena', '/arena']]) {
    fireEvent.press(screen.getByTestId(id));
    expect(mockPush).toHaveBeenLastCalledWith(route);
  }
});

test('retains real totals and labels estimated strength records accurately', () => {
  const screen = render(<ProfileScreen />);
  expect(screen.getByTestId('profile-stat-0')).toHaveTextContent('128');
  expect(screen.getByTestId('profile-stat-2')).toHaveTextContent('162.4');
  expect(screen.getByText('kg · est. 1RM')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: /View all milestones/ }));
  expect(mockPush).toHaveBeenLastCalledWith('/trophies?tab=badges');
  fireEvent.press(screen.getByRole('button', { name: 'All records' }));
  expect(mockPush).toHaveBeenLastCalledWith('/trophies');
});

test('opens the selected completed activity', () => {
  const screen = render(<ProfileScreen />);
  fireEvent.press(screen.getByRole('button', { name: /^Upper body,/ }));
  expect(mockPush).toHaveBeenCalledWith('/workouts/history/w1');
});

test('does not show false zero totals or first-workout prompts while loading', () => {
  mockLoading = true;
  const screen = render(<ProfileScreen />);
  expect(screen.getByTestId('profile-stat-0')).toHaveTextContent('—');
  expect(screen.getByText('Loading your milestones…')).toBeTruthy();
  expect(screen.queryByText('Explore workouts')).toBeNull();
});

test('offers a retry for unavailable data without describing it as an empty account', async () => {
  mockFailed = true;
  const screen = render(<ProfileScreen />);
  expect(screen.getByTestId('profile-stat-0')).toHaveTextContent('—');
  expect(screen.queryByText('Explore workouts')).toBeNull();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Retry loading profile progress' })));
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(mockSummaryRefresh).toHaveBeenCalledTimes(1);
  expect(mockRoamRefresh).toHaveBeenCalledTimes(1);
});

test('gives a genuinely new account a useful next step and locked milestones', () => {
  mockEmpty = true;
  const screen = render(<ProfileScreen />);
  expect(screen.getByTestId('profile-stat-0')).toHaveTextContent('0');
  expect(screen.getByRole('button', { name: /First Step. Not yet earned/ })).toBeTruthy();
  fireEvent.press(screen.getByText('Explore workouts'));
  expect(mockPush).toHaveBeenCalledWith('/workouts');
});
