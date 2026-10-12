import { AuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

// Must mock before importing the module under test
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Re-require to pick up fresh mocks
const { fetchWithAuth, isAuthError, _resetAuthInvalidated } = require('../api');

describe('fetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The global auth-invalidation latch is module-level state; clear it between
    // cases so a prior auth-failure test doesn't fast-fail the next one.
    _resetAuthInvalidated();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
      error: null,
    });
  });

  it('attaches Authorization Bearer header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'ok' })),
    });

    await fetchWithAuth('/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-jwt-token');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed JSON body on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: 1, name: 'test' })),
    });

    const result = await fetchWithAuth('/test');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('returns null for empty response body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    });

    const result = await fetchWithAuth('/test');
    expect(result).toBeNull();
  });

  it('throws error with status and data on 4xx/5xx', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve(JSON.stringify({ error: 'Invalid input' })),
    });

    try {
      await fetchWithAuth('/test');
      fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('Invalid input');
      expect(err.status).toBe(400);
      expect(err.data).toEqual({ error: 'Invalid input' });
    }
  });

  it('throws "No active session" when no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(fetchWithAuth('/test')).rejects.toThrow('No active session');
  });

  it('throws "No active session" on auth error', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new Error('Auth failed'),
    });

    await expect(fetchWithAuth('/test')).rejects.toThrow('No active session');
  });

  it('fails like a network error — without signing out — when the token can\'t refresh offline', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
      error: new AuthRetryableFetchError('Network request failed', 0),
    });

    const error = await fetchWithAuth('/test').catch((e: unknown) => e);
    expect((error as Error).name).toBe('NetworkUnavailableError');
    expect((error as { status?: number }).status).toBeUndefined();
    expect(isAuthError(error)).toBe(false);

    // Back online: the same session still works (no sign-out latch).
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('{"ok":true}') });
    await expect(fetchWithAuth('/test')).resolves.toEqual({ ok: true });
  });

  describe('offline (device reports no connection)', () => {
    const NetInfo = jest.requireMock('@react-native-community/netinfo') as { fetch: jest.Mock };
    const { getStoredSession } = jest.requireMock('@/src/lib/supabase') as { getStoredSession: jest.Mock };
    beforeEach(() => {
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    });
    afterEach(() => getStoredSession.mockReset());

    it('fails fast with an expired token, without asking Supabase (which retries ~30 s)', async () => {
      getStoredSession.mockResolvedValueOnce({ access_token: 'old', expires_at: Math.floor(Date.now() / 1000) - 60 });
      (supabase.auth.getSession as jest.Mock).mockClear();

      const error = await fetchWithAuth('/test').catch((e: unknown) => e);
      expect((error as Error).name).toBe('NetworkUnavailableError');
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses a still-valid stored token directly', async () => {
      getStoredSession.mockResolvedValueOnce({ access_token: 'stored', expires_at: Math.floor(Date.now() / 1000) + 3600 });
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });

      await fetchWithAuth('/test');
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer stored');
    });
  });

  it('passes through custom headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await fetchWithAuth('/test', {
      headers: { 'X-Custom': 'value' },
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Custom']).toBe('value');
    expect(options.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('passes method and body through', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await fetchWithAuth('/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'value' }),
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ data: 'value' }));
  });

  it('throws a typed AuthError on SESSION_REVOKED', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: 'Session revoked. You may be logged in on another device.',
            code: 'SESSION_REVOKED',
          })
        ),
    });

    try {
      await fetchWithAuth('/test');
      fail('Should have thrown');
    } catch (err: any) {
      expect(isAuthError(err)).toBe(true);
      expect(err.code).toBe('SESSION_REVOKED');
      expect(err.reason).toBe('session_revoked');
    }
  });

  it('fast-fails later calls once auth is invalidated, without a second network hit', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve(JSON.stringify({ code: 'SESSION_REVOKED' })),
    });

    await expect(fetchWithAuth('/first')).rejects.toThrow();
    const callsAfterFirst = mockFetch.mock.calls.length;

    // Latch is now set — this must short-circuit before touching the network.
    await expect(fetchWithAuth('/second')).rejects.toThrow();
    expect(mockFetch.mock.calls.length).toBe(callsAfterFirst);
  });
});
