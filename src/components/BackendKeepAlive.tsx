import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { getApiBaseUrl } from '@/src/lib/config/backend';

const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000;

export function BackendKeepAlive() {
  const { isOnline } = useNetworkStatus();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOnline) return;

    const pingBackend = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/health`, { method: 'GET' });
      } catch {
        // Silently ignore — network may have dropped between check and ping
      }
    };

    const startPinging = () => {
      // Clear any existing interval before starting a new one
      if (intervalRef.current) clearInterval(intervalRef.current);
      pingBackend();
      intervalRef.current = setInterval(pingBackend, KEEP_ALIVE_INTERVAL);
    };

    const stopPinging = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Only ping while the app is in the foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startPinging();
      } else {
        stopPinging();
      }
    });

    // Start immediately if app is currently active
    if (AppState.currentState === 'active') {
      startPinging();
    }

    return () => {
      stopPinging();
      subscription.remove();
    };
  }, [isOnline]);

  return null;
}
