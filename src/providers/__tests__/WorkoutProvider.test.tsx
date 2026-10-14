import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockStore = {
  activeId: null as string | null,
  sessions: {} as Record<string, any>,
};

jest.mock('@/src/lib/offline/offlineStore', () => ({
  getActiveOfflineSessionId: jest.fn(async () => mockStore.activeId),
  getOfflineSession: jest.fn(async (id: string) => mockStore.sessions[id] ?? null),
  isOfflineId: (id: string) => id.startsWith('offline-'),
  resolveId: async (id: string) => id,
  persistSessionState: jest.fn(async () => {}),
  setActiveOfflineSessionId: jest.fn(async (id: string | null) => {
    mockStore.activeId = id;
  }),
}));
const mockFinish = jest.fn(async (..._a: unknown[]) => ({}));
const mockAbandon = jest.fn(async (..._a: unknown[]) => ({}));
const mockGetSession = jest.fn(async (..._a: unknown[]) => ({ session: {}, exercise_logs: [] as any[] }));
jest.mock('@/src/lib/offline/offlineApi', () => ({
  offlinePauseSession: jest.fn(),
  offlineResumeSession: jest.fn(),
  offlineFinishSession: (...a: unknown[]) => mockFinish(...a),
  offlineAbandonSession: (...a: unknown[]) => mockAbandon(...a),
  offlineGetSession: (...a: unknown[]) => mockGetSession(...a),
}));
jest.mock('@/src/lib/api/workoutSessions', () => ({
  getActiveSession: jest.fn(async () => ({ active: false, session: null })),
}));
jest.mock('@/src/lib/api', () => ({ isAuthError: () => false }));
jest.mock('@/src/lib/workoutNotification', () => ({
  initialize: jest.fn(async () => {}),
  consumeOpenRequest: jest.fn(async () => null),
  showActiveWorkout: jest.fn(),
  updateTimer: jest.fn(),
  dismiss: jest.fn(async () => {}),
  onAction: jest.fn(() => () => {}),
}));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: true }) }));
const mockAuth = { user: { id: 'u1' } };
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WorkoutProvider, useWorkout } from '@/src/providers/WorkoutProvider';
import { offlinePauseSession, offlineResumeSession } from '@/src/lib/offline/offlineApi';

let ctx: ReturnType<typeof useWorkout> | null = null;
function Probe() {
  ctx = useWorkout();
  return null;
}

const inProgress = (id: string) => ({
  id,
  status: 'in_progress',
  started_at: new Date().toISOString(),
  last_resumed_at: new Date().toISOString(),
  total_duration_sec: 0,
});

async function mount() {
  const r = render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
  await act(async () => {});
  return r;
}

describe('WorkoutProvider active-session fallback', () => {
  beforeEach(() => {
    ctx = null;
    mockStore.activeId = null;
    mockStore.sessions = {};
    mockFinish.mockClear();
  });

  it('does not resurrect a server session the server reports inactive', async () => {
    // Persisted crash-recovery copy of a session finished from the notification.
    mockStore.activeId = 'real-1';
    mockStore.sessions['real-1'] = inProgress('real-1');

    const r = await mount();

    expect(ctx!.activeSession).toBeNull();
    expect(mockStore.activeId).toBeNull();
    r.unmount();
  });

  it('keeps an unsynced offline-started session', async () => {
    mockStore.activeId = 'offline-1';
    mockStore.sessions['offline-1'] = inProgress('offline-1');

    const r = await mount();

    expect(ctx!.activeSession?.id).toBe('offline-1');
    r.unmount();
  });

  it('finishActiveSession from the latest context reaches the API', async () => {
    const r = await mount();
    await act(async () => {
      ctx!.setActiveSession(inProgress('s1') as any);
    });
    await act(async () => {
      await ctx!.finishActiveSession();
    });
    expect(mockFinish).toHaveBeenCalledWith('s1');
    r.unmount();
  });

  it('refreshes Home metrics (streak, weekly stats, XP) when a workout ends', async () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const r = render(
      <QueryClientProvider client={client}>
        <WorkoutProvider>
          <Probe />
        </WorkoutProvider>
      </QueryClientProvider>,
    );
    await act(async () => {});
    await act(async () => {
      ctx!.setActiveSession(inProgress('s1') as any);
    });
    invalidate.mockClear();
    await act(async () => {
      await ctx!.finishActiveSession();
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['retentionMetrics', 'u1'] });
    r.unmount();
  });

  it('uses the latest state when starting then pausing the same workout', async () => {
    const r = await mount();
    const ready = { ...inProgress('s-controls'), status: 'paused', total_duration_sec: 0 };
    const running = { ...ready, status: 'in_progress', last_resumed_at: new Date().toISOString() };
    const paused = { ...ready, total_duration_sec: 12 };
    jest.mocked(offlineResumeSession).mockResolvedValueOnce(running as any);
    jest.mocked(offlinePauseSession).mockResolvedValueOnce(paused as any);
    await act(async () => ctx!.setActiveSession(ready as any));
    expect(ctx!.activeSession?.status).toBe('paused');
    await act(async () => { await ctx!.resumeActiveSession(); });
    expect(ctx!.activeSession?.status).toBe('in_progress');
    await act(async () => { await ctx!.pauseActiveSession(); });
    expect(ctx!.activeSession?.total_duration_sec).toBe(12);
    expect(ctx!.activeSession?.status).toBe('paused');
    r.unmount();
  });

  it('deduplicates rapid pause taps before the state update renders', async () => {
    const r = await mount();
    const running = inProgress('s-double');
    await act(async () => ctx!.setActiveSession(running as any));
    let resolve!: (value: any) => void;
    jest.mocked(offlinePauseSession).mockClear().mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const pause = ctx!.pauseActiveSession;
    await act(async () => {
      const first = pause();
      await pause();
      expect(offlinePauseSession).toHaveBeenCalledTimes(1);
      resolve({ ...running, status: 'paused', total_duration_sec: 3 });
      await first;
    });
    r.unmount();
  });
});

describe('WorkoutProvider 12h auto-close', () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const stale = () => ({
    id: 's-stale',
    status: 'in_progress',
    started_at: hoursAgo(13),
    last_resumed_at: hoursAgo(13),
    total_duration_sec: 0,
  });

  beforeEach(() => {
    mockStore.activeId = null;
    mockStore.sessions = {};
    mockFinish.mockClear();
    mockAbandon.mockClear();
    mockGetSession.mockReset();
  });

  it('finishes a forgotten session at its last logged set instead of abandoning', async () => {
    const lastSet = hoursAgo(12);
    mockGetSession.mockResolvedValue({
      session: {},
      exercise_logs: [{ created_at: hoursAgo(12.5) }, { created_at: lastSet }],
    });
    const r = await mount();
    await act(async () => {
      ctx!.setActiveSession(stale() as any);
    });
    await act(async () => {});

    expect(mockFinish).toHaveBeenCalledWith('s-stale', new Date(lastSet).toISOString());
    expect(mockAbandon).not.toHaveBeenCalled();
    expect(ctx!.activeSession).toBeNull();
    r.unmount();
  });

  it('abandons a forgotten session with no logged sets', async () => {
    mockGetSession.mockResolvedValue({ session: {}, exercise_logs: [] });
    const r = await mount();
    await act(async () => {
      ctx!.setActiveSession(stale() as any);
    });
    await act(async () => {});

    expect(mockFinish).not.toHaveBeenCalled();
    expect(mockAbandon).toHaveBeenCalledWith('s-stale');
    r.unmount();
  });

  it('falls back to abandon when the server rejects the finish', async () => {
    mockGetSession.mockResolvedValue({ session: {}, exercise_logs: [{ created_at: hoursAgo(12) }] });
    mockFinish.mockRejectedValueOnce(Object.assign(new Error('too old'), { status: 400 }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await mount();
    await act(async () => {
      ctx!.setActiveSession(stale() as any);
    });
    await act(async () => {});

    expect(mockAbandon).toHaveBeenCalledWith('s-stale');
    r.unmount();
  });
});
