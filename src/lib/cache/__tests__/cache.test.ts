import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePrefix, cacheClear, isStale } from '../cache';

// The idbGet/idbSet/idbDelete/idbClear are used internally — AsyncStorage is mocked globally
jest.mock('../indexeddb', () => {
  const store: Record<string, string> = {};
  return {
    idbGet: jest.fn(async (key: string) => {
      const raw = store[key];
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
        delete store[key];
        return null;
      }
      return entry.data;
    }),
    idbSet: jest.fn(async (key: string, data: unknown, ttl: number) => {
      store[key] = JSON.stringify({ data, timestamp: Date.now(), ttl });
    }),
    idbDelete: jest.fn(async (key: string) => {
      delete store[key];
    }),
    idbClear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

describe('cache', () => {
  beforeEach(async () => {
    await cacheClear();
    jest.clearAllMocks();
  });

  describe('cacheSet + cacheGet', () => {
    it('stores and retrieves data', async () => {
      await cacheSet('test-key', { name: 'Alice' }, 60_000);
      const result = await cacheGet<{ name: string }>('test-key');
      expect(result).toEqual({ name: 'Alice' });
    });

    it('returns null for missing key', async () => {
      const result = await cacheGet('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns null after TTL expires', async () => {
      await cacheSet('expiring', 'data', 1000);
      jest.advanceTimersByTime(1500);
      const result = await cacheGet('expiring');
      expect(result).toBeNull();
    });

    it('returns data before TTL expires', async () => {
      await cacheSet('fresh', 'data', 5000);
      jest.advanceTimersByTime(2000);
      const result = await cacheGet('fresh');
      expect(result).toBe('data');
    });

    it('never expires when TTL is 0', async () => {
      await cacheSet('forever', 'data', 0);
      jest.advanceTimersByTime(999_999);
      const result = await cacheGet('forever');
      expect(result).toBe('data');
    });
  });

  describe('cacheInvalidate', () => {
    it('removes entry from cache', async () => {
      await cacheSet('to-remove', 'data', 60_000);
      await cacheInvalidate('to-remove');
      const result = await cacheGet('to-remove');
      expect(result).toBeNull();
    });
  });

  describe('cacheInvalidatePrefix', () => {
    it('removes matching prefix entries from memory cache', async () => {
      await cacheSet('user:1', 'alice', 60_000);
      await cacheSet('user:2', 'bob', 60_000);
      await cacheSet('plans:1', 'plan', 60_000);

      await cacheInvalidatePrefix('user:');

      // cacheInvalidatePrefix only clears the in-memory layer.
      // cacheGet will still find data via the persistent idb layer.
      // Verify the non-matching key is untouched in memory.
      expect(isStale('user:1', 0)).toBe(true); // removed from memory
      expect(isStale('user:2', 0)).toBe(true); // removed from memory
      expect(isStale('plans:1', 0)).toBe(false); // still in memory
    });
  });

  describe('cacheClear', () => {
    it('removes all entries', async () => {
      await cacheSet('a', 1, 60_000);
      await cacheSet('b', 2, 60_000);
      await cacheClear();
      expect(await cacheGet('a')).toBeNull();
      expect(await cacheGet('b')).toBeNull();
    });
  });

  describe('isStale', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns true when no entry exists', () => {
      expect(isStale('missing')).toBe(true);
    });

    it('returns false when entry is fresh', async () => {
      await cacheSet('fresh', 'data', 60_000);
      expect(isStale('fresh', 30_000)).toBe(false);
    });

    it('returns true when entry is older than staleTime', async () => {
      await cacheSet('old', 'data', 60_000);
      jest.advanceTimersByTime(31_000);
      expect(isStale('old', 30_000)).toBe(true);
    });
  });
});
