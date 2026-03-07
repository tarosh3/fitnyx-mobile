import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const KEY_PREFIX = 'fitnyx-cache:';

function wrapKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(wrapKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      await idbDelete(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  await AsyncStorage.setItem(wrapKey(key), JSON.stringify(entry));
}

export async function idbDelete(key: string): Promise<void> {
  await AsyncStorage.removeItem(wrapKey(key));
}

export async function idbClear(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith(KEY_PREFIX));
  if (cacheKeys.length) {
    await Promise.all(cacheKeys.map((key) => AsyncStorage.removeItem(key)));
  }
}

export async function idbCleanup(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith(KEY_PREFIX));
  if (!cacheKeys.length) return;

  const expired: string[] = [];

  await Promise.all(
    cacheKeys.map(async (key) => {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      try {
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
          expired.push(key);
        }
      } catch {
        expired.push(key);
      }
    })
  );

  if (expired.length) {
    await Promise.all(expired.map((key) => AsyncStorage.removeItem(key)));
  }
}

export interface OfflineMutation {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

export async function addToOfflineQueue(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>): Promise<void> {
  const queue = (await idbGet<OfflineMutation[]>('offline-mutation-queue')) ?? [];
  const next: OfflineMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: Date.now(),
  };
  queue.push(next);
  await idbSet('offline-mutation-queue', queue, 7 * 24 * 60 * 60 * 1000);
}

export async function getOfflineQueue(): Promise<OfflineMutation[]> {
  return (await idbGet<OfflineMutation[]>('offline-mutation-queue')) ?? [];
}

export async function clearOfflineQueue(): Promise<void> {
  await idbDelete('offline-mutation-queue');
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const next = queue.filter((item) => item.id !== id);
  if (next.length === 0) {
    await idbDelete('offline-mutation-queue');
    return;
  }
  await idbSet('offline-mutation-queue', next, 7 * 24 * 60 * 60 * 1000);
}
