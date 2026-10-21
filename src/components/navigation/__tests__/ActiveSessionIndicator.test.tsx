import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, type KeyboardEvent, type KeyboardEventName } from 'react-native';

import type { WorkoutSession } from '@/src/lib/api/workoutSessions';

const mockPush = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockHaptic = jest.fn();
let mockPathname = '/';
let mockSession: WorkoutSession | null;
let mockElapsed = 0;
let mockOffline = false;
let mockCoachOpen = false;
let mockAuth = { user: { id: 'player-user' } as { id: string } | null, loading: false, onboardingComplete: true, isAuthOpen: false };

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/src/providers/WorkoutProvider', () => ({
  useWorkout: () => ({ activeSession: mockSession, pauseActiveSession: mockPause, resumeActiveSession: mockResume }),
  useWorkoutTimer: () => ({
    elapsedTime: mockElapsed,
    formatTime: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  }),
}));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/src/providers/AICoachProvider', () => ({ useAICoach: () => ({ isOpen: mockCoachOpen }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/src/hooks/useOfflineAware', () => ({ useOfflineAware: () => ({ isOffline: mockOffline }) }));
jest.mock('@/src/lib/haptics', () => ({ haptic: { light: () => mockHaptic() } }));
const mockToast = jest.fn();
jest.mock('@/src/features/workouts/ui/Toast', () => ({ showToast: (...a: unknown[]) => mockToast(...a) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
}));

import { ActiveSessionIndicator } from '../ActiveSessionIndicator';

const readySession: WorkoutSession = {
  id: 'session-1', user_id: 'player-user', status: 'paused', total_duration_sec: 0,
  workout_date: '2026-10-14', started_at: '2026-10-14T08:00:00Z', created_at: '2026-10-14T08:00:00Z',
};

describe('ActiveSessionIndicator', () => {
  const keyboardListeners = new Map<KeyboardEventName, (event: KeyboardEvent) => void>();
  const keyboardSubscriptions: jest.Mock[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    mockSession = { ...readySession };
    mockElapsed = 0;
    mockOffline = false;
    mockCoachOpen = false;
    mockAuth = { user: { id: 'player-user' }, loading: false, onboardingComplete: true, isAuthOpen: false };
    mockPause.mockResolvedValue(undefined);
    mockResume.mockResolvedValue(undefined);
    keyboardListeners.clear();
    keyboardSubscriptions.length = 0;
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
      keyboardListeners.set(event, callback);
      const remove = jest.fn();
      keyboardSubscriptions.push(remove);
      return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    mockToast.mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps a ready workout stopped when mounted or opened', () => {
    mockElapsed = 420; // A previous live tick must not leak into the ready state.
    const screen = render(<ActiveSessionIndicator />);

    expect(screen.getByTestId('active-session-state')).toHaveTextContent('Ready');
    expect(screen.getByTestId('active-session-time')).toHaveTextContent('0:00');
    expect(screen.getByRole('button', { name: 'Start workout timer' })).toBeTruthy();
    fireEvent.press(screen.getByTestId('active-session-open'));

    expect(mockPush).toHaveBeenCalledWith('/workouts/session/session-1');
    expect(mockPause).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('starts only on Play and prevents duplicate taps until the action settles', async () => {
    let finishResume!: () => void;
    mockResume.mockImplementationOnce(() => new Promise<void>((resolve) => { finishResume = resolve; }));
    const screen = render(<ActiveSessionIndicator />);

    fireEvent.press(screen.getByTestId('active-session-toggle'));
    fireEvent.press(screen.getByTestId('active-session-toggle'));
    expect(mockResume).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('active-session-toggle')).toBeDisabled();
    expect(screen.getByTestId('active-session-toggle')).toHaveProp('accessibilityState', { disabled: true, busy: true });
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => { finishResume(); });
    mockSession = { ...readySession, status: 'in_progress' };
    mockElapsed = 9;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.getByTestId('active-session-state')).toHaveTextContent('Training');
    expect(screen.getByTestId('active-session-time')).toHaveTextContent('0:09');
    expect(screen.getByRole('button', { name: 'Pause workout timer' })).toBeEnabled();
  });

  it('pauses a running workout without navigating, then renders its saved duration', async () => {
    mockSession = { ...readySession, status: 'in_progress' };
    mockElapsed = 65;
    const screen = render(<ActiveSessionIndicator />);

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Pause workout timer' })); });
    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    mockSession = { ...readySession, total_duration_sec: 65 };
    mockElapsed = 80;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.getByTestId('active-session-state')).toHaveTextContent('Paused');
    expect(screen.getByTestId('active-session-time')).toHaveTextContent('1:05');
    expect(screen.getByRole('button', { name: 'Resume workout timer' })).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByTestId('active-session-toggle')); });
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('releases the control after a failed action and gives a retry message', async () => {
    mockResume.mockRejectedValueOnce(new Error('Offline write failed'));
    const screen = render(<ActiveSessionIndicator />);

    await act(async () => { fireEvent.press(screen.getByTestId('active-session-toggle')); });

    expect(mockToast).toHaveBeenCalledWith(expect.stringMatching(/^Couldn’t update the timer/), 'error');
    expect(screen.getByTestId('active-session-toggle')).toBeEnabled();
    await act(async () => { fireEvent.press(screen.getByTestId('active-session-toggle')); });
    expect(mockResume).toHaveBeenCalledTimes(2);
  });

  it('keeps offline workouts visible and explains their connection state', () => {
    mockOffline = true;
    const screen = render(<ActiveSessionIndicator />);

    expect(screen.getByText('Workout · Offline')).toBeTruthy();
    expect(screen.getByTestId('active-session-open')).toHaveProp('accessibilityLabel', expect.stringContaining('Offline'));
  });

  it.each([
    '/workouts/session/session-1', '/workouts/session/another-session', '/workouts/routine/edit',
    '/workouts/programs/program-1', '/workouts/history/session-1', '/workouts/summary/session-1',
    '/login', '/signup', '/onboarding', '/invite', '/access-expired', '/auth/callback', '/roam/record', '/water',
  ])('does not cover full-screen controls on %s', (pathname) => {
    mockPathname = pathname;
    const screen = render(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
  });

  it('hides stale or completed sessions and auth/coach overlays', () => {
    const screen = render(<ActiveSessionIndicator />);
    mockCoachOpen = true;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    mockCoachOpen = false;
    mockAuth.isAuthOpen = true;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    mockAuth.isAuthOpen = false;
    mockAuth.user = null;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    mockAuth.user = { id: 'player-user' };
    mockAuth.onboardingComplete = false;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    mockAuth.onboardingComplete = true;
    mockSession = { ...readySession, status: 'completed' };
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    mockSession = null;
    screen.rerender(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
  });

  it('hides for the keyboard, restores afterward, and removes subscriptions', () => {
    const screen = render(<ActiveSessionIndicator />);
    act(() => keyboardListeners.get('keyboardDidShow')!({} as KeyboardEvent));
    expect(screen.queryByTestId('active-session-player')).toBeNull();
    act(() => keyboardListeners.get('keyboardDidHide')!({} as KeyboardEvent));
    expect(screen.getByTestId('active-session-player')).toBeTruthy();
    screen.unmount();
    for (const remove of keyboardSubscriptions) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('stays hidden when mounted with a keyboard already open', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const screen = render(<ActiveSessionIndicator />);
    expect(screen.queryByTestId('active-session-player')).toBeNull();
  });
});
