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

// TTL is freshness, not lifetime: an expired entry reads as a miss (so callers
// refetch) but stays on disk as the offline fallback — idbGetStale serves it.
// Deleting on expiry left offline screens empty 30 min after the last fetch.
async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(wrapKey(key));
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const entry = await readEntry<T>(key);
  if (!entry) return null;
  if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) return null;
  return entry.data;
}

/** The stored value even if expired — last-known data for offline. */
export async function idbGetStale<T>(key: string): Promise<T | null> {
  return (await readEntry<T>(key))?.data ?? null;
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

const QUEUE_KEY = 'offline-mutation-queue';
// Long enough that a workout logged offline survives weeks without signal —
// at 7 days, a trip away from coverage silently dropped it.
const QUEUE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Every queue write is read-modify-write of one AsyncStorage value. Without
// serialization, a set logged while the sync engine removes an entry can
// interleave (both read [A,B], each writes its own version) and drop or
// resurrect mutations. All writers go through this chain.
let queueLock: Promise<unknown> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueLock.then(fn, fn);
  queueLock = run.catch(() => undefined);
  return run;
}

/** Atomically rewrite the queue. The mutator must not call other queue writers (deadlock). */
export function updateOfflineQueue(
  mutator: (queue: OfflineMutation[]) => OfflineMutation[],
): Promise<void> {
  return withQueueLock(async () => {
    const queue = (await idbGet<OfflineMutation[]>(QUEUE_KEY)) ?? [];
    const next = mutator(queue);
    if (next.length === 0) {
      await idbDelete(QUEUE_KEY);
      return;
    }
    await idbSet(QUEUE_KEY, next, QUEUE_TTL_MS);
  });
}

const queueListeners = new Set<() => void>();

/** Called after each mutation is queued (SyncManager syncs it if online). */
export function onOfflineQueueAdd(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export async function addToOfflineQueue(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>): Promise<void> {
  const next: OfflineMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: Date.now(),
  };
  await updateOfflineQueue((queue) => [...queue, next]);
  queueListeners.forEach((listener) => listener());
}

export async function getOfflineQueue(): Promise<OfflineMutation[]> {
  return (await idbGet<OfflineMutation[]>(QUEUE_KEY)) ?? [];
}

export async function clearOfflineQueue(): Promise<void> {
  await withQueueLock(() => idbDelete(QUEUE_KEY));
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  await updateOfflineQueue((queue) => queue.filter((item) => item.id !== id));
}
