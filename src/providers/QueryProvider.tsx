import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import React from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

// Disable refetchOnWindowFocus for React Native (no "window" concept)
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      handleFocus(status === 'active');
    }
  });
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min — tabs won't refetch within this window
      gcTime: 10 * 60 * 1000, // 10 min garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

export { queryClient };

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
