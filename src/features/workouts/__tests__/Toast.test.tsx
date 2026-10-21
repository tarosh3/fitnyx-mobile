import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

jest.mock('expo-router', () => ({ usePathname: () => '/' }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { showToast, ToastProvider, useToast } from '../ui/Toast';

function Trigger() {
  const toast = useToast();
  return (
    <Pressable onPress={() => toast('Couldn’t save that', 'error')}><Text>save</Text></Pressable>
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('shows a toast from the hook, then hides it', () => {
  render(<ToastProvider><Trigger /></ToastProvider>);
  fireEvent.press(screen.getByText('save'));
  expect(screen.getByText('Couldn’t save that')).toBeOnTheScreen();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.queryByText('Couldn’t save that')).not.toBeOnTheScreen();
});

it('shows toasts from outside the provider (root overlays, back handler)', () => {
  render(<ToastProvider><Text>app</Text></ToastProvider>);
  act(() => showToast('Press back again to exit'));
  expect(screen.getByText('Press back again to exit')).toBeOnTheScreen();
});
