import type { User } from '@supabase/supabase-js';
import React from 'react';
import * as ReactNative from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn(() => false);
const mockRefresh = jest.fn(async () => {});
const mockOpenCoach = jest.fn();
const mockSendMessage = jest.fn();
const mockGetDailyInsight = jest.fn();
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn<Promise<void>, unknown[]>(async () => {});

function emptyMetrics() {
  return {
    loading: false,
    error: false,
    refresh: mockRefresh,
    activePlan: null,
    activeSession: null as import('@/src/lib/api/workoutSessions').WorkoutSession | null,
    currentDay: null,
    currentDayIndex: 1,
    totalDays: 0,
    nextExercisesCount: 0,
    sessions: [],
    streakDays: 0,
    level: 1,
    xp: 0,
    nextLevelXp: 1500,
    levelProgress: 0,
    dailyInsight: 'Build consistency at a pace that works for you.',
  };
}

let mockMetrics = emptyMetrics();
let mockTheme: 'dark' | 'light' = 'dark';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, dismissAll: mockDismissAll, canDismiss: mockCanDismiss }),
}));
jest.mock('@/src/hooks/useRetentionMetrics', () => ({ useRetentionMetrics: () => mockMetrics }));
jest.mock('@/src/providers/AICoachProvider', () => ({
  useAICoach: () => ({ openCenteredChat: mockOpenCoach, sendMessage: mockSendMessage }),
}));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('@/src/lib/api/agent', () => ({ getDailyInsight: () => mockGetDailyInsight() }));
jest.mock('@/src/lib/cache', () => ({
  cacheGet: (key: string) => mockCacheGet(key),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  cacheKeys: { dailyInsight: (userId: string, date: string) => `insight:${userId}:${date}` },
  cacheTTL: { DAY: 86_400 },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
    require('react').createElement(require('react-native').View, props, children),
}));
// Plan data has its own fetch + cache; Home's tests cover Home.
jest.mock('../components/PlanTodayCard', () => ({ PlanTodayCard: () => null }));
jest.mock('@/src/features/goals/ui/TodayGoalsCard', () => ({ TodayGoalsCard: () => null }));
jest.mock('@/src/features/arena/ui/ArenaHomeCard', () => ({ ArenaHomeCard: () => null }));
jest.mock('@/src/features/notifications/ui/NotificationBell', () => ({ NotificationBell: () => null }));
jest.mock('../components/ActivityHeatmap', () => ({
  ActivityHeatmap: () => require('react').createElement(require('react-native').View, { testID: 'history-heatmap' }),
}));

import { MobileHome } from '../MobileHome';
import { localDateKey } from '@/src/lib/api/workoutSessions';

const user: User = {
  id: 'home-user',
  user_metadata: { first_name: 'Sam' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-10-12T00:00:00.000Z',
};

describe('MobileHome actions and data states', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    mockMetrics = emptyMetrics();
    mockTheme = 'dark';
    mockCacheGet.mockResolvedValue(null);
    mockGetDailyInsight.mockResolvedValue({ insight: 'A generated daily insight.' });
  });

  it.each(['loading', 'error'] as const)('keeps daily shortcuts, profile, and coach usable during %s', (state) => {
    mockMetrics = { ...emptyMetrics(), [state]: true };
    const screen = render(<MobileHome user={user} />);

    for (const [id, route] of [
      ['home-roam', '/roam'],
      ['home-nutrition', '/diet'],
      ['home-water', '/water'],
    ]) {
      fireEvent.press(screen.getByTestId(id));
      expect(mockPush).toHaveBeenLastCalledWith(route);
    }
    // The avatar opens the profile tab (not the edit form), resetting the stack like the dock.
    mockCanDismiss.mockReturnValueOnce(true);
    fireEvent.press(screen.getByTestId('home-profile'));
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenLastCalledWith('/me');
    expect(mockPush).not.toHaveBeenCalledWith('/profile');
    fireEvent.press(screen.getByTestId('home-coach'));
    expect(mockOpenCoach).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(screen.queryByTestId('home-workout-card')).toBeNull();
    expect(screen.queryByTestId('home-week-summary')).toBeNull();
  });

  it('retries failed activity without removing the everyday actions', async () => {
    mockMetrics = { ...emptyMetrics(), error: true };
    const screen = render(<MobileHome user={user} />);

    await act(async () => fireEvent.press(screen.getByTestId('home-retry')));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home-roam')).toBeTruthy();
    expect(screen.getByTestId('home-coach')).toBeTruthy();
  });

  it('offers plan discovery and activity stats to a user with no workouts', () => {
    const screen = render(<MobileHome user={user} />);

    expect(screen.getByText('See your plan')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/plan');
    fireEvent.press(screen.getByTestId('home-view-stats'));
    expect(mockPush).toHaveBeenLastCalledWith('/dashboard');
  });

  it('expands and collapses workout history on demand', () => {
    const screen = render(<MobileHome user={user} />);

    expect(screen.queryByTestId('history-heatmap')).toBeNull();
    fireEvent.press(screen.getByTestId('home-history'));
    expect(screen.getByTestId('history-heatmap')).toBeTruthy();
    expect(screen.queryByLabelText('Show workout activity history')).toBeNull();
    fireEvent.press(screen.getByTestId('home-history'));
    expect(screen.queryByTestId('history-heatmap')).toBeNull();
  });

  it('uses the supplied insight without reading cache or generating another one', () => {
    const screen = render(<MobileHome user={user} />);

    expect(screen.getByText(mockMetrics.dailyInsight)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Coach insight. ${mockMetrics.dailyInsight}` })).toBeTruthy();
    expect(mockCacheGet).not.toHaveBeenCalled();
    expect(mockGetDailyInsight).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('home-insight'));
    expect(screen.getByRole('button', { name: `Coach insight. ${mockMetrics.dailyInsight}`, expanded: true })).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-coach'));
    expect(mockOpenCoach).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('prioritizes Roam and nutrition ahead of planned workouts and detailed stats', () => {
    const screen = render(<MobileHome user={user} />);
    const actions = screen.getAllByRole('button').map((button) => button.props.testID);
    expect(actions.indexOf('home-roam')).toBeLessThan(actions.indexOf('home-workout-card'));
    expect(actions.indexOf('home-nutrition')).toBeLessThan(actions.indexOf('home-workout-card'));
    expect(actions.indexOf('home-workout-card')).toBeLessThan(actions.indexOf('home-view-stats'));
  });

  it.each(['loading', 'error'] as const)('keeps an unfinished workout first and resumable while dashboard is %s', (state) => {
    mockMetrics = { ...emptyMetrics(), [state]: true, activeSession: {
      id: 'resume-1', user_id: user.id, workout_date: '2026-10-24',
      started_at: '2026-10-24T08:00:00Z', status: 'in_progress',
      total_duration_sec: 0, created_at: '2026-10-24T08:00:00Z',
    } };
    const screen = render(<MobileHome user={user} />);
    const actions = screen.getAllByRole('button').map((button) => button.props.testID);
    expect(actions.indexOf('home-workout-card')).toBeLessThan(actions.indexOf('home-roam'));
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/workouts/session/resume-1');
    fireEvent.press(screen.getByTestId('home-nutrition'));
    expect(mockPush).toHaveBeenLastCalledWith('/diet');
  });

  it('refreshes from the native pull-to-refresh control', async () => {
    const screen = render(<MobileHome user={user} />);
    const control = screen.getByTestId('home-scroll').props.refreshControl;
    await act(async () => control.props.onRefresh());
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it.each(['dark', 'light'] as const)('keeps actions reachable with long names and enlarged text in %s', (theme) => {
    mockTheme = theme;
    const dimensions = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({ width: 320, height: 700, scale: 3, fontScale: 1.6 });
    const screen = render(<MobileHome user={{ ...user, user_metadata: { first_name: 'Alexandria Montgomery-Williams' } }} />);
    expect(screen.getByText('Alexandria Montgomery-Williams')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-roam'));
    expect(mockPush).toHaveBeenLastCalledWith('/roam');
    fireEvent.press(screen.getByTestId('home-water'));
    expect(mockPush).toHaveBeenLastCalledWith('/water');
    expect(screen.getByRole('progressbar', { name: 'Progress to level 2' })).toBeTruthy();
    dimensions.mockRestore();
  });

  it('reuses the user’s local-day cached insight when dashboard text is absent', async () => {
    mockMetrics = { ...emptyMetrics(), dailyInsight: '' };
    mockCacheGet.mockResolvedValue('Your cached coaching note.');
    const screen = render(<MobileHome user={user} />);

    await waitFor(() => expect(screen.getByText('Your cached coaching note.')).toBeTruthy());

    expect(mockCacheGet).toHaveBeenCalledWith(`insight:${user.id}:${localDateKey(new Date())}`);
    expect(mockGetDailyInsight).not.toHaveBeenCalled();
  });
});

// Navigation/data tests don't require the native worklet runtime.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: 'system' },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: (style: () => unknown) => style(),
  withTiming: (value: number) => value,
}));
