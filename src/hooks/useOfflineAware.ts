import { useCallback, useEffect, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { getOfflineQueue } from '@/src/lib/cache/indexeddb';

export function useOfflineAware() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getOfflineQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Refresh count when coming back online (sync may clear it)
  useEffect(() => {
    if (isOnline) {
      const timeout = setTimeout(refreshPendingCount, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, refreshPendingCount]);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
    hasPendingSync: pendingCount > 0,
    refreshPendingCount,
  };
}
