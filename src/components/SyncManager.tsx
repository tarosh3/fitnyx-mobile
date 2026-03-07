import { useEffect } from 'react';

import { getQueuedRequests, removeQueuedRequest } from '@/src/lib/db';
import { fetchWithAuth } from '@/src/lib/api';

export function SyncManager() {
  useEffect(() => {
    const processQueue = async () => {
      try {
        const queued = await getQueuedRequests();
        if (!queued.length) return;

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
      } catch (error) {
        console.error('Queue processing failed', error);
      }
    };

    processQueue();
    const interval = setInterval(processQueue, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
