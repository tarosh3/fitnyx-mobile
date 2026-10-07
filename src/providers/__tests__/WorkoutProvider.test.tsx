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
  persistSessionState: jest.fn(async () => {}),
  setActiveOfflineSessionId: jest.fn(async (id: string | null) => {
    mockStore.activeId = id;
  }),
}));
const mockFinish = jest.fn(async (..._a: unknown[]) => ({}));
jest.mock('@/src/lib/offline/offlineApi', () => ({
  offlinePauseSession: jest.fn(),
  offlineResumeSession: jest.fn(),
  offlineFinishSession: (...a: unknown[]) => mockFinish(...a),
  offlineAbandonSession: jest.fn(),
}));
jest.mock('@/src/lib/api/workoutSessions', () => ({
  getActiveSession: jest.fn(async () => ({ active: false, session: null })),
}));
jest.mock('@/src/lib/api', () => ({ isAuthError: () => false }));
jest.mock('@/src/lib/workoutNotification', () => ({
  initialize: jest.fn(),
  showActiveWorkout: jest.fn(),
  updateTimer: jest.fn(),
  dismiss: jest.fn(async () => {}),
  onAction: jest.fn(() => () => {}),
}));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: true }) }));
const mockAuth = { user: { id: 'u1' } };
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

import { WorkoutProvider, useWorkout } from '@/src/providers/WorkoutProvider';

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
    <WorkoutProvider>
      <Probe />
    </WorkoutProvider>,
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
});
