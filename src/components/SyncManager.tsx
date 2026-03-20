import { useEffect } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { processOfflineQueue } from '@/src/lib/offline/syncEngine';

/**
 * Processes the offline mutation queue when connectivity is restored.
 *
 * Sync is event-driven (triggered by isOnline changing to true),
 * not polled on an interval, to avoid unnecessary battery drain.
 * AuthProvider also calls processOfflineQueue on reconnect as a
 * secondary trigger.
 */
export function SyncManager() {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) return;

    processOfflineQueue().catch((error) => {
      console.warn('Offline queue processing failed', error);
    });
  }, [isOnline]);

  return null;
}
