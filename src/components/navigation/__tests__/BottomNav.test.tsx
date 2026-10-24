import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';
import { AccessibilityInfo, Keyboard, type KeyboardEvent, type KeyboardEventName } from 'react-native';

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn(() => true);
const mockOpenCoach = jest.fn();
const mockSendMessage = jest.fn();
let mockPathname = '/';
let mockUser: { id: string } | null = { id: 'nav-user' };
let mockOnboardingComplete = true;
let mockCoachOpen = false;

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: mockReplace,
    dismissAll: mockDismissAll,
    canDismiss: mockCanDismiss,
  }),
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, onboardingComplete: mockOnboardingComplete, avatarUrl: null, userProfile: { first_name: 'Tarosh', last_name: 'Mathuria', username: 'tarosh3' } }),
}));
jest.mock('@/src/providers/AICoachProvider', () => ({
  useAICoach: () => ({ openCenteredChat: mockOpenCoach, sendMessage: mockSendMessage, isOpen: mockCoachOpen }),
}));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
}));
// Keep these navigation tests independent of the native worklet runtime.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  ReduceMotion: { System: 'system' },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: (style: () => unknown) => style(),
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
  withSequence: (...values: unknown[]) => values[values.length - 1],
}));

import { BottomNav } from '../BottomNav';

describe('BottomNav navigation and visibility', () => {
  const keyboardListeners = new Map<KeyboardEventName, (event: KeyboardEvent) => void>();
  const keyboardSubscriptions: jest.Mock[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    mockUser = { id: 'nav-user' };
    mockOnboardingComplete = true;
    mockCoachOpen = false;
    mockCanDismiss.mockReturnValue(true);
    keyboardListeners.clear();
    keyboardSubscriptions.length = 0;
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
      keyboardListeners.set(event, callback);
      const remove = jest.fn();
      keyboardSubscriptions.push(remove);
      return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['home', '/', '/workouts/plans/plan-1'],
    ['workouts', '/workouts', '/dashboard'],
    ['progress', '/dashboard', '/workouts'],
    ['profile', '/me', '/roam'],
    ['profile', '/me', '/settings'],
  ])('opens the %s root after clearing the pushed stack', (tab, destination, current) => {
    mockPathname = current;
    const screen = render(<BottomNav />);

    fireEvent.press(screen.getByTestId(`nav-${tab}`));

    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(destination);
    expect(mockDismissAll.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0]);
  });

  it('navigates without dismissing when there is no pushed stack', () => {
    mockCanDismiss.mockReturnValue(false);
    const screen = render(<BottomNav />);

    fireEvent.press(screen.getByTestId('nav-workouts'));

    expect(mockDismissAll).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/workouts');
  });

  it.each([
    ['home', '/'],
    ['workouts', '/workouts'],
    ['progress', '/dashboard'],
    ['profile', '/me'],
  ])('does nothing when the selected %s root is tapped again', (tab, current) => {
    mockPathname = current;
    const screen = render(<BottomNav />);

    expect(screen.getByTestId(`nav-${tab}`)).toHaveProp('accessibilityRole', 'tab');
    expect(screen.getByTestId(`nav-${tab}`)).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    fireEvent.press(screen.getByTestId(`nav-${tab}`));

    expect(mockCanDismiss).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each([
    ['workouts', '/exercises', '/workouts'],
    ['home', '/roam/activity-1', '/'],
    ['profile', '/settings', '/me'],
  ])('selects %s on %s while allowing return to its root', (tab, current, destination) => {
    mockPathname = current;
    const screen = render(<BottomNav />);

    for (const id of ['home', 'workouts', 'progress', 'profile']) {
      expect(screen.getByTestId(`nav-${id}`)).toHaveProp('accessibilityState', expect.objectContaining({ selected: id === tab }));
    }
    fireEvent.press(screen.getByTestId(`nav-${tab}`));

    expect(mockReplace).toHaveBeenCalledWith(destination);
  });

  it('gives Profile the same labeled custom-icon treatment as the other tabs', () => {
    const screen = render(<BottomNav />);

    expect(screen.getByTestId('nav-profile')).toHaveProp('accessibilityLabel', 'Profile');
    expect(screen.queryByText('TM', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Profile', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Settings', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps the accessibility order aligned with the five visible slots', () => {
    const screen = render(<BottomNav />);
    expect(screen.getAllByTestId(/^nav-(home|workouts|coach|progress|profile)$/).map((item) => item.props.testID))
      .toEqual(['nav-home', 'nav-workouts', 'nav-coach', 'nav-progress', 'nav-profile']);
  });

  it('opens Coach without navigating or sending a message', () => {
    const screen = render(<BottomNav />);

    expect(screen.getByTestId('nav-coach')).toHaveProp('accessibilityRole', 'button');
    fireEvent.press(screen.getByTestId('nav-coach'));

    expect(mockOpenCoach).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
  });

  it('hides the dock until onboarding is complete', () => {
    mockOnboardingComplete = false;
    const screen = render(<BottomNav />);

    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });

  it('hides behind Coach and restores the selected destination when Coach closes', () => {
    mockPathname = '/workouts';
    const screen = render(<BottomNav />);
    mockCoachOpen = true;
    screen.rerender(<BottomNav />);
    expect(screen.queryByTestId('bottom-nav')).toBeNull();

    mockCoachOpen = false;
    screen.rerender(<BottomNav />);
    expect(screen.getByTestId('nav-workouts')).toHaveProp('accessibilityState', { selected: true });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('uses a solid dock when Reduce Transparency is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
    const screen = render(<BottomNav />);

    // Compare the count, not the array: a failed toHaveLength pretty-prints the
    // fibers (~1 s each), which used up waitFor's budget on the slower CI runner.
    await waitFor(() => expect(screen.UNSAFE_queryAllByType(BlurView).length).toBe(0));
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
    fireEvent.press(screen.getByTestId('nav-workouts'));
    expect(mockReplace).toHaveBeenCalledWith('/workouts');
  });

  it('hides the dock when signed out', () => {
    mockUser = null;
    const screen = render(<BottomNav />);

    expect(screen.queryByTestId('bottom-nav')).toBeNull();
    expect(screen.queryByTestId('nav-coach')).toBeNull();
  });

  it.each([
    '/onboarding',
    '/login',
    '/signup',
    '/update-password',
    '/profile',
    '/fitness-profile',
    '/water',
    '/reminders',
    '/settings/coach-memory',
    '/dashboard/stats',
    '/workouts/routine/edit',
    '/workouts/routine/r-1',
    '/workouts/summary/session-1',
    '/workouts/history/session-1',
    '/workouts/exercise/ex-1',
    '/workouts/programs/plan-1',
    '/workouts/session/session-1',
    '/roam/record',
    '/privacy-policy',
    '/terms-of-service',
    '/delete-account',
    '/email-verified',
    '/verification-failed',
    '/invite',
    '/access-expired',
    '/trophies',
  ])('keeps the dock hidden on full-screen route %s', (current) => {
    mockPathname = current;
    const screen = render(<BottomNav />);

    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });

  it('hides while the keyboard is open, restores afterward, and cleans up subscriptions', () => {
    const screen = render(<BottomNav />);
    const show = keyboardListeners.get('keyboardWillShow') ?? keyboardListeners.get('keyboardDidShow');
    const hide = keyboardListeners.get('keyboardWillHide') ?? keyboardListeners.get('keyboardDidHide');

    expect(show).toBeDefined();
    expect(hide).toBeDefined();
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
    act(() => show!({} as KeyboardEvent));
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
    act(() => hide!({} as KeyboardEvent));
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();

    screen.unmount();
    for (const remove of keyboardSubscriptions) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('stays hidden if mounted while the keyboard is already open', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const screen = render(<BottomNav />);

    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });
});
