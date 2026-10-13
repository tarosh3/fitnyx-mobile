import type { User } from '@supabase/supabase-js';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
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
    activeSession: null,
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

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/hooks/useRetentionMetrics', () => ({ useRetentionMetrics: () => mockMetrics }));
jest.mock('@/src/providers/AICoachProvider', () => ({
  useAICoach: () => ({ openCenteredChat: mockOpenCoach, sendMessage: mockSendMessage }),
}));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockMetrics = emptyMetrics();
    mockCacheGet.mockResolvedValue(null);
    mockGetDailyInsight.mockResolvedValue({ insight: 'A generated daily insight.' });
  });

  it.each(['loading', 'error'] as const)('keeps daily shortcuts, profile, and coach usable during %s', (state) => {
    mockMetrics = { ...emptyMetrics(), [state]: true };
    const screen = render(<MobileHome user={user} />);

    for (const [id, route] of [
      ['home-roam', '/roam'],
      ['home-nutrition', '/dashboard/diet'],
      ['home-water', '/water'],
      ['home-profile', '/profile'],
    ]) {
      fireEvent.press(screen.getByTestId(id));
      expect(mockPush).toHaveBeenLastCalledWith(route);
    }
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

    expect(screen.getByText('Explore plans')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/workouts');
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

  it('reuses the user’s local-day cached insight when dashboard text is absent', async () => {
    mockMetrics = { ...emptyMetrics(), dailyInsight: '' };
    mockCacheGet.mockResolvedValue('Your cached coaching note.');
    const screen = render(<MobileHome user={user} />);

    await waitFor(() => expect(screen.getByText('Your cached coaching note.')).toBeTruthy());

    expect(mockCacheGet).toHaveBeenCalledWith(`insight:${user.id}:${localDateKey(new Date())}`);
    expect(mockGetDailyInsight).not.toHaveBeenCalled();
  });
});
