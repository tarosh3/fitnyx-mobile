import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetBoard = jest.fn();
const mockSetPublic = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, canGoBack: () => true, back: jest.fn() }),
    useLocalSearchParams: () => ({}),
    usePathname: () => '/arena',
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
// Reanimated doesn't load in jest (see profilePhoto.test.tsx); the board tabs aren't under test here.
jest.mock('@/src/components/ui/SegmentedControl', () => ({ SegmentedControl: () => null }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/providers/WorkoutOverlayProvider', () => ({ useWorkoutOverlayInset: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/lib/network', () => ({ isDefinitelyOffline: () => Promise.resolve(false) }));
jest.mock('@/src/lib/cache', () => ({
  cacheKeys: { arenaBoard: (...a: string[]) => a.join(':') },
  cacheTTL: { SHORT: 60000 },
  cacheGetStale: () => Promise.resolve(null),
  cacheSet: () => Promise.resolve(),
}));
jest.mock('@/src/lib/api/arena', () => ({
  getArenaBoard: (...a: unknown[]) => mockGetBoard(...a),
  setArenaPublic: (v: boolean) => mockSetPublic(v),
}));

import { ArenaScreen } from '../ArenaScreen';

const user = (id: string, name: string | null = null) => ({ id, username: id, name, avatar_url: '' });
const friendsBoard = {
  board: 'grit', scope: 'friends', period: 'week', from: '2026-10-19', to: '2026-10-25',
  rows: [{ rank: 1, user: user('anya', 'Anya'), score: 300, me: false }, { rank: 2, user: user('me', 'Me'), score: 120, me: true }],
  me: { rank: 2, score: 120, listed: false },
};
const globalBoard = { ...friendsBoard, scope: 'global', rows: [{ rank: 1, user: user('xan'), score: 9000, me: false }], me: { rank: null, score: 120, listed: false } };

beforeEach(() => {
  mockGetBoard.mockReset().mockImplementation((_b: string, scope: string) => Promise.resolve(scope === 'global' ? globalBoard : friendsBoard));
  mockSetPublic.mockReset().mockResolvedValue({ public: true });
});

it('ranks against friends, and lets the user join Global', async () => {
  render(<ArenaScreen />);
  await waitFor(() => expect(screen.getByTestId('arena-standing')).toHaveTextContent('#2 of 2'));
  expect(screen.getByText(/180 Grit behind @anya/)).toBeOnTheScreen();
  expect(mockGetBoard).toHaveBeenCalledWith('grit', 'friends', 'week', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));

  fireEvent.press(screen.getByTestId('arena-scope-global'));
  await waitFor(() => expect(screen.getByTestId('arena-standing')).toHaveTextContent('Join Global to get ranked'));
  expect(screen.getByText('@xan')).toBeOnTheScreen();

  fireEvent(screen.getByTestId('arena-optin'), 'valueChange', true);
  await waitFor(() => expect(mockSetPublic).toHaveBeenCalledWith(true));
});
