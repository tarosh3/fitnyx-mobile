import { useEffect } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { getQueuedRequests, removeQueuedRequest } from '@/src/lib/db';
import { fetchWithAuth } from '@/src/lib/api';
import { processOfflineQueue } from '@/src/lib/offline/syncEngine';

export function SyncManager() {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) return;

    const processQueue = async () => {
      // Process legacy request queue (from db.ts)
      try {
        const queued = await getQueuedRequests();
        if (queued.length) {
          for (const request of queued) {
            try {
              await fetchWithAuth(request.url, {
                method: request.method,
                body: JSON.stringify(request.body),
              });
              await removeQueuedRequest(request.id);
            } catch (error) {
              console.error('Failed to replay queued request', error);
            }
          }
        }
      } catch (error) {
        console.error('Legacy queue processing failed', error);
      }

      // Process new offline mutation queue
      try {
        await processOfflineQueue();
      } catch (error) {
        console.error('Offline queue processing failed', error);
      }
    };

    processQueue();
    const interval = setInterval(processQueue, 60000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return null;
}
