import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGetDashboard = jest.fn();
jest.mock('@/src/lib/api/dashboard', () => ({ getDashboard: () => mockGetDashboard() }));
jest.mock('@/src/providers/WorkoutProvider', () => ({ useWorkout: () => ({ activeSession: null }) }));
jest.mock('@/src/lib/cache', () => ({
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => {}),
  cacheKeys: { dashboard: (id: string) => `d:${id}` },
  cacheTTL: { LONG: 1 },
}));

import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';

const session = {
  id: 's1',
  status: 'completed',
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
  total_duration_sec: 3600,
  total_volume_kg: 1000,
};
const dashboard = (extra: object) => ({
  sessions: [session],
  total_sessions: 1,
  active_plan: null,
  current_day: null,
  current_day_index: 1,
  total_days: 0,
  daily_insight: '',
  ...extra,
});

// The hook sets a 10-min gcTime; clear clients so their GC timers don't keep
// Jest alive after the run.
const clients: QueryClient[] = [];
afterEach(() => {
  clients.splice(0).forEach((c) => c.clear());
});

function renderMetrics() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRetentionMetrics('u1'), { wrapper });
}

describe('useRetentionMetrics XP', () => {
  it('uses the server lifetime XP when present', async () => {
    mockGetDashboard.mockResolvedValue(dashboard({ lifetime_xp: 45_000 }));
    const { result } = renderMetrics();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.xp).toBe(45_000);
    expect(result.current.level).toBe(31);
  });

  it('falls back to the client calculation on older backends', async () => {
    mockGetDashboard.mockResolvedValue(dashboard({}));
    const { result } = renderMetrics();
    await waitFor(() => expect(result.current.loading).toBe(false));
    // 300 + 60 min × 5 + 1000 kg / 100
    expect(result.current.xp).toBe(610);
    expect(result.current.level).toBe(1);
  });
});
