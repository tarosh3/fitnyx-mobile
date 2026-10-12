import AsyncStorage from '@react-native-async-storage/async-storage';

import { cacheGet, cacheGetStale, cacheSet } from '../cache';
import { idbGet, idbGetStale, idbSet } from '../indexeddb';

beforeEach(() => AsyncStorage.clear());

it('treats an expired entry as a miss but keeps it as the offline fallback', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  await idbSet('k', { v: 1 }, 100);

  now.mockReturnValue(5_000); // long past the TTL
  expect(await idbGet('k')).toBeNull();
  expect(await idbGetStale('k')).toEqual({ v: 1 });
  // Reading the miss must not delete it.
  expect(await idbGetStale('k')).toEqual({ v: 1 });
  now.mockRestore();
});

it('cacheGetStale serves the last value after expiry', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  await cacheSet('m', 'last-known', 100);

  now.mockReturnValue(5_000);
  expect(await cacheGet('m')).toBeNull();
  expect(await cacheGetStale('m')).toBe('last-known');
  now.mockRestore();
});
