import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  idbGet,
  idbSet,
  idbDelete,
  idbClear,
  idbCleanup,
  addToOfflineQueue,
  getOfflineQueue,
  clearOfflineQueue,
  removeFromOfflineQueue,
} from '../indexeddb';

describe('indexeddb (AsyncStorage persistence)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('idbSet + idbGet', () => {
    it('stores and retrieves data with prefix', async () => {
      await idbSet('test', { value: 42 }, 60_000);
      const result = await idbGet<{ value: number }>('test');
      expect(result).toEqual({ value: 42 });
    });

    it('applies fitnyx-cache: prefix to AsyncStorage key', async () => {
      await idbSet('mykey', 'hello', 60_000);
      const raw = await AsyncStorage.getItem('fitnyx-cache:mykey');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toBe('hello');
    });

    it('returns null for missing key', async () => {
      const result = await idbGet('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('returns null for expired entries', async () => {
      // Manually store an expired entry
      const entry = { data: 'old', timestamp: Date.now() - 10_000, ttl: 5_000 };
      await AsyncStorage.setItem('fitnyx-cache:expired', JSON.stringify(entry));

      const result = await idbGet('expired');
      expect(result).toBeNull();
    });

    it('returns data for non-expired entries', async () => {
      await idbSet('fresh', 'hello', 60_000);
      const result = await idbGet('fresh');
      expect(result).toBe('hello');
    });

    it('does not expire entries with ttl=0', async () => {
      const entry = { data: 'forever', timestamp: 1, ttl: 0 };
      await AsyncStorage.setItem('fitnyx-cache:noexpire', JSON.stringify(entry));

      const result = await idbGet('noexpire');
      expect(result).toBe('forever');
    });
  });

  describe('idbDelete', () => {
    it('removes entry from storage', async () => {
      await idbSet('to-delete', 'data', 60_000);
      await idbDelete('to-delete');
      const result = await idbGet('to-delete');
      expect(result).toBeNull();
    });
  });

  describe('idbClear', () => {
    it('removes only cache-prefixed keys', async () => {
      await idbSet('cache1', 'a', 60_000);
      await idbSet('cache2', 'b', 60_000);
      await AsyncStorage.setItem('other-key', 'should-remain');

      await idbClear();

      expect(await idbGet('cache1')).toBeNull();
      expect(await idbGet('cache2')).toBeNull();
      expect(await AsyncStorage.getItem('other-key')).toBe('should-remain');
    });
  });

  describe('idbCleanup', () => {
    it('removes expired entries and keeps valid ones', async () => {
      // Valid entry
      await idbSet('valid', 'keep', 60_000);

      // Expired entry
      const expired = { data: 'remove', timestamp: Date.now() - 10_000, ttl: 5_000 };
      await AsyncStorage.setItem('fitnyx-cache:expired', JSON.stringify(expired));

      await idbCleanup();

      expect(await idbGet('valid')).toBe('keep');
      const removedRaw = await AsyncStorage.getItem('fitnyx-cache:expired');
      expect(removedRaw).toBeNull();
    });
  });

  describe('offline queue', () => {
    it('adds and retrieves mutations', async () => {
      await addToOfflineQueue({ type: 'UPDATE_WEIGHT', payload: { weight: 70 } });
      await addToOfflineQueue({ type: 'LOG_EXERCISE', payload: { reps: 10 } });

      const queue = await getOfflineQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].type).toBe('UPDATE_WEIGHT');
      expect(queue[1].type).toBe('LOG_EXERCISE');
      expect(queue[0].id).toBeTruthy();
      expect(queue[0].timestamp).toBeGreaterThan(0);
    });

    it('returns empty array when no queue', async () => {
      const queue = await getOfflineQueue();
      expect(queue).toEqual([]);
    });

    it('removes specific mutation by id', async () => {
      await addToOfflineQueue({ type: 'A', payload: {} });
      await addToOfflineQueue({ type: 'B', payload: {} });

      const queue = await getOfflineQueue();
      await removeFromOfflineQueue(queue[0].id);

      const updated = await getOfflineQueue();
      expect(updated).toHaveLength(1);
      expect(updated[0].type).toBe('B');
    });

    it('clears entire queue', async () => {
      await addToOfflineQueue({ type: 'A', payload: {} });
      await addToOfflineQueue({ type: 'B', payload: {} });

      await clearOfflineQueue();

      const queue = await getOfflineQueue();
      expect(queue).toEqual([]);
    });

    it('clears queue when removing last item', async () => {
      await addToOfflineQueue({ type: 'ONLY', payload: {} });
      const queue = await getOfflineQueue();

      await removeFromOfflineQueue(queue[0].id);

      const updated = await getOfflineQueue();
      expect(updated).toEqual([]);
    });
  });
});
