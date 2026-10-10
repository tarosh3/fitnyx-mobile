import React from 'react';
import { act, render } from '@testing-library/react-native';

import { supabase } from '@/src/lib/supabase';

const mockGetSessionId = jest.fn(async () => 'backend-session' as string | null);
const mockRegisterSession = jest.fn(async () => 'backend-session');
jest.mock('@/src/lib/api/auth', () => ({
  getSessionId: () => mockGetSessionId(),
  registerSession: () => mockRegisterSession(),
  clearSessionId: jest.fn(async () => {}),
}));
jest.mock('@/src/lib/api', () => ({
  _registerAuthFailureHandler: jest.fn(),
  isAuthError: () => false,
  isInviteGateError: () => false,
  saveMetric: jest.fn(),
}));
jest.mock('@/src/lib/api/onboarding', () => ({
  getOnboardingStatus: jest.fn(async () => ({ onboarding_complete: true })),
}));
jest.mock('@/src/lib/api/users', () => ({ getProfile: jest.fn(async () => ({})) }));
jest.mock('@/src/lib/cache', () => ({
  cacheClear: jest.fn(async () => {}),
  cacheGet: jest.fn(async () => ({ complete: true })),
  cacheSet: jest.fn(async () => {}),
  cacheKeys: { onboardingStatus: (id: string) => `o:${id}`, userProfile: (id: string) => `p:${id}` },
  cacheTTL: { MEDIUM: 1, DAY: 1 },
}));
jest.mock('@/src/lib/cache/indexeddb', () => ({
  clearOfflineQueue: jest.fn(async () => {}),
  getOfflineQueue: jest.fn(async () => []),
}));
jest.mock('@/src/lib/offline/offlineStore', () => ({ clearAllOfflineData: jest.fn(async () => {}) }));
jest.mock('@/src/lib/offline/syncEngine', () => ({ processOfflineQueue: jest.fn(async () => ({})) }));
jest.mock('@/src/lib/reminders', () => ({ clearAllReminders: jest.fn(async () => {}) }));
jest.mock('@/src/lib/water', () => ({ clearAllWaterData: jest.fn(async () => {}) }));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: false }) }));
jest.mock('@sentry/react-native', () => ({ setUser: jest.fn() }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn() }));

import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';

const user = { id: 'u1' };
const session = { access_token: 't', expires_at: Math.floor(Date.now() / 1000) + 3600, user };

const loadingHistory: boolean[] = [];
function Probe() {
  const { loading } = useAuth();
  loadingHistory.push(loading);
  return null;
}

async function boot() {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session }, error: null });
  const r = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await act(async () => {});
  const calls = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls;
  const listener = calls[calls.length - 1][0] as (event: string, s: unknown) => Promise<void>;
  return { r, listener };
}

describe('AuthProvider token refresh', () => {
  beforeEach(() => {
    loadingHistory.length = 0;
    mockRegisterSession.mockClear();
    mockGetSessionId.mockReset();
    mockGetSessionId.mockResolvedValue('backend-session');
  });

  it('does not flip loading for a routine refresh of the signed-in user', async () => {
    const { r, listener } = await boot();
    expect(loadingHistory[loadingHistory.length - 1]).toBe(false);
    const before = loadingHistory.length;

    // Hold the session-id lookup open so any intermediate loading=true commits.
    let release: (v: string) => void = () => {};
    mockGetSessionId.mockImplementation(() => new Promise<string>((res) => (release = res)));
    let done: Promise<void> = Promise.resolve();
    await act(async () => {
      done = listener('TOKEN_REFRESHED', { ...session, access_token: 't2' });
    });
    await act(async () => {
      release('backend-session');
      await done;
    });

    expect(loadingHistory.slice(before)).not.toContain(true);
    expect(mockRegisterSession).not.toHaveBeenCalled();
    r.unmount();
  });

  it('still re-registers when the backend session id is missing', async () => {
    const { r, listener } = await boot();
    mockGetSessionId.mockResolvedValue(null);

    await act(async () => {
      await listener('TOKEN_REFRESHED', { ...session, access_token: 't2' });
    });

    expect(mockRegisterSession).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});
