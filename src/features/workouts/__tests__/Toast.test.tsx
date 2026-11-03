import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

jest.mock('expo-router', () => ({ usePathname: () => '/' }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { showToast, ToastProvider, useToast, useToastLift } from '../ui/Toast';

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

/** The toast card's `bottom`: walk up from its text to the view that positions it. */
function toastBottom(text: string): number | undefined {
  let node = screen.getByText(text).parent;
  while (node) {
    const bottom = StyleSheet.flatten(node.props.style)?.bottom;
    if (typeof bottom === 'number') return bottom;
    node = node.parent;
  }
  return undefined;
}

function Lifted({ px }: { px: number }) {
  useToastLift(px);
  return null;
}

it('stays above a taller floating bar (the Rest bar) while it is shown', () => {
  const { rerender } = render(<ToastProvider><Lifted px={200} /></ToastProvider>);
  act(() => showToast('Timer started'));
  expect(toastBottom('Timer started')).toBe(208); // 200 + 8 gap
  rerender(<ToastProvider><Text>no bar</Text></ToastProvider>);
  act(() => showToast('Timer started'));
  expect(toastBottom('Timer started')).toBeLessThan(200);
});
