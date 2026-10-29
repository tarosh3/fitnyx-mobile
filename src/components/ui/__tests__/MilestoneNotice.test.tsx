import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { haptic } from '@/src/lib/haptics';
import { claimMilestone, MilestoneNotice } from '../MilestoneNotice';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/src/lib/haptics', () => ({ haptic: { success: jest.fn() } }));

const key = 'milestone:test';
beforeEach(async () => { mockFocused = true; jest.clearAllMocks(); await AsyncStorage.clear(); });

it('establishes a baseline without celebrating historical progress', async () => {
  expect(await claimMilestone(key, 'level', 4)).toBe(false);
  expect(await claimMilestone(key, 'level', 5)).toBe(true);
  expect(await claimMilestone(key, 'level', 5)).toBe(false);
});

it('does not replay rewards when stale data temporarily decreases the value', async () => {
  await claimMilestone(key, 'level', 4);
  expect(await claimMilestone(key, 'level', 2)).toBe(false);
  expect(await claimMilestone(key, 'level', 4)).toBe(false);
});

it('resets the baseline on a new day or changed goal targets', async () => {
  await claimMilestone(key, 'today:steps:6000', 0);
  expect(await claimMilestone(key, 'today:steps:3000', 1)).toBe(false);
  expect(await claimMilestone(key, 'tomorrow:steps:3000', 0)).toBe(false);
  expect(await claimMilestone(key, 'tomorrow:steps:3000', 1)).toBe(true);
});

it('claims a reward once even when two consumers update together', async () => {
  await claimMilestone(key, 'level', 2);
  expect(await Promise.all([claimMilestone(key, 'level', 3), claimMilestone(key, 'level', 3)])).toEqual([true, false]);
});

it('recovers safely from a malformed stored baseline', async () => {
  await AsyncStorage.setItem(key, '{broken');
  expect(await claimMilestone(key, 'level', 3)).toBe(false);
});


it.each([
  ['level', 4, 5, 'Level 5 reached!'],
  ['today:steps:6000', 0, 1, 'Daily goal reached!'],
])('celebrates a %s milestone once when returning to the visible screen', async (scope, baseline, reached, message) => {
  await claimMilestone(key, scope, baseline);
  mockFocused = false;
  const screen = render(<MilestoneNotice storageKey={key} scope={scope} value={reached} ready message={message} />);
  await act(async () => {});
  expect(haptic.success).not.toHaveBeenCalled();
  expect(screen.queryByText(message)).toBeNull();
  expect(JSON.parse((await AsyncStorage.getItem(key))!).value).toBe(baseline);

  mockFocused = true;
  screen.rerender(<MilestoneNotice storageKey={key} scope={scope} value={reached} ready message={message} />);
  await waitFor(() => expect(screen.getByText(message)).toBeOnTheScreen());
  expect(haptic.success).toHaveBeenCalledTimes(1);
  screen.unmount();
  const reopened = render(<MilestoneNotice storageKey={key} scope={scope} value={reached} ready message={message} />);
  await act(async () => {});
  expect(reopened.queryByText(message)).toBeNull();
  expect(haptic.success).toHaveBeenCalledTimes(1);
});

it('waits for loaded data before claiming a milestone', async () => {
  await claimMilestone(key, 'level', 2);
  render(<MilestoneNotice storageKey={key} scope="level" value={3} ready={false} message="Level 3 reached!" />);
  await act(async () => {});
  expect(haptic.success).not.toHaveBeenCalled();
  expect(JSON.parse((await AsyncStorage.getItem(key))!).value).toBe(2);
});
