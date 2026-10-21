import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGet = jest.fn();
const mockRead = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, canGoBack: () => true, back: jest.fn() }),
    usePathname: () => '/notifications',
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/providers/WorkoutOverlayProvider', () => ({ useWorkoutOverlayInset: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/lib/cache', () => ({
  cacheKeys: { notifications: (id: string) => `n:${id}` },
  cacheTTL: { SHORT: 60000 },
  cacheGetStale: () => Promise.resolve(null),
  cacheSet: () => Promise.resolve(),
}));
jest.mock('@/src/lib/api/notifications', () => ({
  getNotifications: () => mockGet(),
  markNotificationsRead: () => mockRead(),
}));

import { NotificationsScreen } from '../NotificationsScreen';

const actor = { id: 'a', username: 'kapil', name: 'Kapil', avatar_url: '' };
const list = (read: boolean) => ({
  unread_count: read ? 0 : 1,
  notifications: [{ id: '1', kind: 'overtaken', actor, data: { board: 'grit', period: 'w2026-10-19' }, created_at: new Date().toISOString(), read }],
});

beforeEach(() => {
  mockGet.mockReset().mockResolvedValueOnce(list(false)).mockResolvedValue(list(true));
  mockRead.mockReset().mockResolvedValue(undefined);
  mockPush.mockReset();
});

it('shows notices, marks them read on open, and opens the Arena from a "passed you"', async () => {
  render(<NotificationsScreen />);
  const line = await screen.findByText('Kapil passed you on Grit this week. Time to fight back?');
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
  // After the server confirms, the list is reloaded.
  await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  fireEvent.press(line);
  expect(mockPush).toHaveBeenCalledWith('/arena?board=grit');
});

it('doesn’t call the server when nothing is unread', async () => {
  mockGet.mockReset().mockResolvedValue({ unread_count: 0, notifications: [] });
  render(<NotificationsScreen />);
  expect(await screen.findByText(/Nothing yet/)).toBeOnTheScreen();
  expect(mockRead).not.toHaveBeenCalled();
});
