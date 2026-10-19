import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProfileScreen } from '@/src/features/profile/ProfileScreen';
import { ProgressScreen } from '@/src/features/progress/ProgressScreen';
import { addDays } from '@/src/features/progress/range';
import { fetchProgressDaily, fetchProgressStrength, fetchProgressSummary, type ProgressSummary } from '@/src/lib/api/progress';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheClear } from '@/src/lib/cache';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, avatarUrl: null, userProfile: { first_name: 'Tarosh', last_name: 'Mathuria', username: 'tarosh3', bio: 'Lifting and running.' } }),
}));
jest.mock('@/src/providers/WorkoutOverlayProvider', () => ({ useWorkoutOverlayInset: () => 0 }));
jest.mock('@/src/hooks/useRetentionMetrics', () => ({
  useRetentionMetrics: () => ({ dailyInsight: 'Squat is up 7.5 kg in 8 weeks.', level: 3, xp: 3420, nextLevelXp: 4500, levelProgress: 28, sessions: [] }),
}));
jest.mock('@/src/features/roam/useRoamActivities', () => ({ useRoamActivities: () => ({ data: { data: [] } }) }));
jest.mock('@/src/lib/api/progress', () => ({ fetchProgressDaily: jest.fn(), fetchProgressStrength: jest.fn(), fetchProgressSummary: jest.fn() }));
jest.mock('@/src/lib/api/onboarding', () => ({ getFitnessProfile: jest.fn().mockResolvedValue({ primary_goal: 'build_muscle', experience_level: 'intermediate' }) }));
jest.mock('@/src/lib/api', () => ({ ...jest.requireActual('@/src/lib/api'), fetchMetricsHistory: jest.fn().mockResolvedValue([]) }));

const today = localDateKey(new Date());
const summary: ProgressSummary = {
  streak: { current_weeks: 3, best_weeks: 5, this_week: true },
  lifetime: { workouts: 32, volume_kg: 43619, roams: 10, distance_m: 38206 },
  records: {
    lifts: [{ exercise_uuid: 'bench', name: 'Bench Press', e1rm_kg: 83.3, weight_kg: 62.5, reps: 10, date: today, sets: 8 }],
    efforts: [{ km: 5, sec: 1490, date: addDays(today, -60), activity_id: 'r1' }],
    longest_roam: null, most_climb: null,
  },
};

// Clear clients so their GC timers don't keep Jest from exiting.
const clients: QueryClient[] = [];
afterEach(() => { clients.splice(0).forEach((q) => q.clear()); });

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(async () => {
  await cacheClear();
  jest.clearAllMocks();
  (fetchProgressDaily as jest.Mock).mockImplementation(async (from: string, to: string) => ({
    from, to,
    days: [
      { date: today, workouts: 1, workout_sec: 3600, volume_kg: 4200, sets: 18, roams: 1, roam_sec: 1800, distance_m: 5200 },
      { date: addDays(today, -8), workouts: 1, workout_sec: 3600, volume_kg: 3000, sets: 15, roams: 0, roam_sec: 0, distance_m: 0 },
    ],
  }));
  (fetchProgressSummary as jest.Mock).mockResolvedValue(summary);
  (fetchProgressStrength as jest.Mock).mockResolvedValue({
    from: today, to: today, muscles: [{ group: 'Chest', sets: 12 }, { group: 'Quads', sets: 4 }],
    lifts: [{ exercise_uuid: 'bench', name: 'Bench Press', sets: 8, points: [{ date: today, e1rm_kg: 83.3 }] }],
  });
});

describe('Progress tab', () => {
  it('shows the range totals, the change, the streak and new records', async () => {
    const screen = renderWithQuery(<ProgressScreen />);
    expect(await screen.findByLabelText(/1 hours 30 minutes in total/)).toBeTruthy(); // 90 minutes this week
    expect(screen.getByText('+50%')).toBeTruthy(); // vs 60 minutes the week before
    expect(screen.getByText('5.2')).toBeTruthy();
    expect(await screen.findByText('week streak')).toBeTruthy();
    expect(screen.getByText('New records')).toBeTruthy();
    expect(screen.getByText("Filo's read")).toBeTruthy();
    // One request covers the range and the 7 days before it.
    expect(fetchProgressDaily).toHaveBeenCalledWith(addDays(today, -13), today);
  });

  it('shows a loading state, not zeros, until the first data arrives', async () => {
    // Two daily requests: the selected range and the calendar month.
    const pending: ((v: unknown) => void)[] = [];
    (fetchProgressDaily as jest.Mock).mockImplementation(() => new Promise((r) => { pending.push(r); }));
    const screen = renderWithQuery(<ProgressScreen />);
    expect(await screen.findByTestId('progress-loading')).toBeTruthy();
    expect(screen.queryByText('Active time')).toBeNull();
    await waitFor(() => expect(pending.length).toBe(2));
    pending.forEach((r) => r({ from: today, to: today, days: [] }));
    expect(await screen.findByText('Active time')).toBeTruthy();
    expect(screen.queryByTestId('progress-loading')).toBeNull();
  });

  it('disables day bars for a year and refetches for the new range', async () => {
    const screen = renderWithQuery(<ProgressScreen />);
    await screen.findByLabelText(/1 hours 30 minutes/);
    fireEvent.press(screen.getByTestId('range-1y'));
    await waitFor(() => expect(fetchProgressDaily).toHaveBeenCalledWith(addDays(today, -729), today));
    expect(screen.getByTestId('gran-day')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
    expect(screen.getByTestId('gran-month')).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  });

  it('loads strength only when its view opens', async () => {
    const screen = renderWithQuery(<ProgressScreen />);
    await screen.findByLabelText(/1 hours 30 minutes/);
    expect(fetchProgressStrength).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('progress-strength'));
    expect(await screen.findByText('Sets per muscle')).toBeTruthy();
    expect(await screen.findByText('Chest')).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('applies a custom range from the sheet', async () => {
    const screen = renderWithQuery(<ProgressScreen />);
    await screen.findByLabelText(/1 hours 30 minutes/);
    fireEvent.press(screen.getByTestId('range-custom'));
    fireEvent.press(await screen.findByText('Year to date'));
    expect(screen.getByTestId('range-message').props.children).toMatch(/days · shown by/);
    fireEvent.press(screen.getByTestId('range-apply'));
    const yearStart = `${today.slice(0, 4)}-01-01`;
    await waitFor(() => expect(fetchProgressDaily).toHaveBeenLastCalledWith(expect.any(String), today));
    expect((fetchProgressDaily as jest.Mock).mock.calls.some(([from]) => from < yearStart)).toBe(true);
  });
});

describe('Profile tab', () => {
  it('shows who you are, your totals and opens Settings', async () => {
    const screen = renderWithQuery(<ProfileScreen />);
    expect(screen.getByText('Tarosh Mathuria')).toBeTruthy();
    expect(screen.getByText('@tarosh3')).toBeTruthy();
    expect(screen.getByText('TM')).toBeTruthy();
    expect(screen.getByText('LV 3')).toBeTruthy();
    expect(await screen.findByText('Trophy case')).toBeTruthy();
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText('Personal bests')).toBeTruthy();
    expect(await screen.findByText('Build muscle')).toBeTruthy();
    fireEvent.press(screen.getByTestId('open-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
