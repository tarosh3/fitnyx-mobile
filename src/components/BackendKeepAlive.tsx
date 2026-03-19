import { useEffect } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { getApiBaseUrl } from '@/src/lib/config/backend';

const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000;

export function BackendKeepAlive() {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) return;

    const pingBackend = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/health`, { method: 'GET' });
      } catch {
        // Silently ignore — network may have dropped between check and ping
      }
    };

    pingBackend();
    const interval = setInterval(pingBackend, KEEP_ALIVE_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline]);

  return null;
}
