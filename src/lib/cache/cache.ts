import { idbGet, idbSet, idbDelete, idbClear } from './indexeddb';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const memory = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (memory) {
    if (memory.ttl === 0 || now - memory.timestamp < memory.ttl) {
      return memory.data;
    }
    memoryCache.delete(key);
  }

  const persisted = await idbGet<T>(key);
  if (persisted !== null) {
    memoryCache.set(key, { data: persisted, timestamp: now, ttl: DEFAULT_TTL });
    return persisted;
  }

  return null;
}

export async function cacheSet<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
  await idbSet(key, data, ttl);
}

export async function cacheInvalidate(key: string): Promise<void> {
  memoryCache.delete(key);
  await idbDelete(key);
}

export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  [...memoryCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  });
}

export async function cacheClear(): Promise<void> {
  memoryCache.clear();
  await idbClear();
}

export function isStale(key: string, staleTime: number = 30_000): boolean {
  const entry = memoryCache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > staleTime;
}
