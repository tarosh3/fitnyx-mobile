import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimMilestone } from '../MilestoneNotice';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

const key = 'milestone:test';
beforeEach(async () => { await AsyncStorage.clear(); });

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
