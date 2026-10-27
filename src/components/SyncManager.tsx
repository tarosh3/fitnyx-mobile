import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { getOfflineQueue, onOfflineQueueAdd } from '@/src/lib/cache/indexeddb';
import { onOfflineSync, processOfflineQueue } from '@/src/lib/offline/syncEngine';
import { prefetchWorkoutMedia } from '@/src/lib/offline/mediaPrefetch';

// While online with work still queued (server error, rate limit, a set waiting
// on its session), retry on a backoff instead of waiting for the next reconnect.
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

/**
 * Sends the offline mutation queue: when connectivity returns, when something
 * is queued while online, when the app comes to the foreground, and on a
 * backoff while items remain. After a sync that sent something, cached
 * queries refetch so Home, Stats and history show the synced work.
 * AuthProvider also triggers a sync on reconnect; runs are deduped.
 */
export function SyncManager() {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const onlineRef = useRef(isOnline);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);

  useEffect(() => {
    onlineRef.current = isOnline;

    const sync = async () => {
      if (!onlineRef.current) return;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      try {
        await processOfflineQueue();
      } catch (error) {
        console.warn('Offline queue processing failed', error);
      }
      const left = await getOfflineQueue().catch(() => []);
      if (left.length === 0) {
        attempt.current = 0;
        return;
      }
      if (!onlineRef.current || retryTimer.current) return;
      const delay = RETRY_DELAYS_MS[Math.min(attempt.current, RETRY_DELAYS_MS.length - 1)];
      attempt.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        sync();
      }, delay);
    };

    if (!isOnline) return;
    attempt.current = 0;
    sync();

    const offAdd = onOfflineQueueAdd(() => {
      attempt.current = 0;
      sync();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      offAdd();
      appState.remove();
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [isOnline]);

  useEffect(() => onOfflineSync(() => queryClient.invalidateQueries()), [queryClient]);

  // When online, warm the offline video cache for saved routines (Wi-Fi only,
  // respects the Downloads setting, single-flight and capped internally).
  useEffect(() => {
    if (!isOnline) return;
    prefetchWorkoutMedia().catch(() => undefined);
  }, [isOnline]);

  return null;
}
