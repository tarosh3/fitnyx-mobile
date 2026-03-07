import { useEffect } from 'react';
import { getApiBaseUrl } from '@/src/lib/config/backend';

const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000;

export function BackendKeepAlive() {
  useEffect(() => {
    const pingBackend = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/health`, { method: 'GET' });
      } catch (error) {
        console.debug('Keep-alive ping failed', error);
      }
    };

    pingBackend();
    const interval = setInterval(pingBackend, KEEP_ALIVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return null;
}
