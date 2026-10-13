import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, type KeyboardEvent, type KeyboardEventName } from 'react-native';

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn(() => true);
const mockOpenCoach = jest.fn();
const mockSendMessage = jest.fn();
let mockPathname = '/';
let mockUser: { id: string } | null = { id: 'nav-user' };
let mockOnboardingComplete = true;

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: mockReplace,
    dismissAll: mockDismissAll,
    canDismiss: mockCanDismiss,
  }),
}));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: mockUser, onboardingComplete: mockOnboardingComplete }) }));
jest.mock('@/src/providers/AICoachProvider', () => ({
  useAICoach: () => ({ openCenteredChat: mockOpenCoach, sendMessage: mockSendMessage }),
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
    ['workouts', '/exercises', '/dashboard'],
    ['stats', '/dashboard', '/workouts/history'],
    ['settings', '/settings', '/dashboard/diet'],
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
    expect(mockReplace).toHaveBeenCalledWith('/exercises');
  });

  it.each([
    ['home', '/'],
    ['workouts', '/exercises'],
    ['stats', '/dashboard'],
    ['settings', '/settings'],
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
    ['workouts', '/workouts/plans/plan-1', '/exercises'],
    ['workouts', '/roam/activity-1', '/exercises'],
    ['stats', '/dashboard/diet', '/dashboard'],
  ])('selects %s on %s while allowing return to its root', (tab, current, destination) => {
    mockPathname = current;
    const screen = render(<BottomNav />);

    for (const id of ['home', 'workouts', 'stats', 'settings']) {
      expect(screen.getByTestId(`nav-${id}`)).toHaveProp('accessibilityState', expect.objectContaining({ selected: id === tab }));
    }
    fireEvent.press(screen.getByTestId(`nav-${tab}`));

    expect(mockReplace).toHaveBeenCalledWith(destination);
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
    '/workouts/customize',
    '/workouts/session/session-1',
    '/roam/record',
    '/privacy-policy',
    '/terms-of-service',
    '/delete-account',
    '/email-verified',
    '/verification-failed',
    '/invite',
    '/access-expired',
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
