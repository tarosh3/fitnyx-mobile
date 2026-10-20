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
  cacheGetStale: jest.fn(async () => null),
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

describe('AuthProvider offline launch', () => {
  it('opens the app for the stored user when the expired token cannot refresh offline', async () => {
    const { AuthRetryableFetchError } = jest.requireActual('@supabase/supabase-js');
    const { getStoredUser } = jest.requireMock('@/src/lib/supabase') as { getStoredUser: jest.Mock };
    const { clearAllOfflineData } = jest.requireMock('@/src/lib/offline/offlineStore') as {
      clearAllOfflineData: jest.Mock;
    };
    getStoredUser.mockResolvedValueOnce(user);
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
      error: new AuthRetryableFetchError('Network request failed', 0),
    });

    let seen: { id: string } | null = null;
    function UserProbe() {
      seen = useAuth().user as { id: string } | null;
      return null;
    }
    render(
      <AuthProvider>
        <UserProbe />
      </AuthProvider>,
    );
    await act(async () => {});

    expect(seen).toEqual(user);
    expect(clearAllOfflineData).not.toHaveBeenCalled();
  });
});

describe('AuthProvider offline launch (no connection)', () => {
  it('opens from the stored session without waiting on Supabase', async () => {
    const NetInfo = jest.requireMock('@react-native-community/netinfo') as { fetch: jest.Mock };
    const { getStoredSession } = jest.requireMock('@/src/lib/supabase') as { getStoredSession: jest.Mock };
    NetInfo.fetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    getStoredSession.mockResolvedValueOnce({ access_token: 'old', expires_at: 0, user });
    (supabase.auth.getSession as jest.Mock).mockClear();

    let seen: { id: string } | null = null;
    function UserProbe() {
      seen = useAuth().user as { id: string } | null;
      return null;
    }
    render(
      <AuthProvider>
        <UserProbe />
      </AuthProvider>,
    );
    await act(async () => {});

    expect(seen).toEqual(user);
    expect(supabase.auth.getSession).not.toHaveBeenCalled();
  });
});

describe('AuthProvider sign-out', () => {
  it('keeps local data (offline queue included) when Supabase sign-out fails offline', async () => {
    const { clearOfflineQueue } = jest.requireMock('@/src/lib/cache/indexeddb') as { clearOfflineQueue: jest.Mock };
    const { clearAllOfflineData } = jest.requireMock('@/src/lib/offline/offlineStore') as {
      clearAllOfflineData: jest.Mock;
    };
    clearOfflineQueue.mockClear();
    clearAllOfflineData.mockClear();
    (supabase.auth as unknown as { signOut: jest.Mock }).signOut = jest.fn(async () => ({
      error: new Error('Network request failed'),
    }));

    let doSignOut: (() => Promise<void>) | null = null;
    function SignOutProbe() {
      doSignOut = useAuth().signOut;
      return null;
    }
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session }, error: null });
    render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );
    await act(async () => {});

    await expect(doSignOut!()).rejects.toThrow('Network request failed');
    expect(clearOfflineQueue).not.toHaveBeenCalled();
    expect(clearAllOfflineData).not.toHaveBeenCalled();
  });
});

describe('AuthProvider onboarding complete', () => {
  it('reloads the profile, so the username chosen in onboarding shows right away', async () => {
    const { getProfile } = jest.requireMock('@/src/lib/api/users') as { getProfile: jest.Mock };
    getProfile.mockResolvedValueOnce({ id: 'u1', username: 'user_u1' }).mockResolvedValue({ id: 'u1', username: 'tarosh' });
    let auth: ReturnType<typeof useAuth> | null = null;
    function Grab() {
      auth = useAuth();
      return null;
    }
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session }, error: null });
    render(<AuthProvider><Grab /></AuthProvider>);
    await act(async () => {});
    expect(auth!.userProfile?.username).toBe('user_u1');

    await act(async () => { auth!.markOnboardingComplete(); });
    expect(auth!.userProfile?.username).toBe('tarosh');
  });
});
