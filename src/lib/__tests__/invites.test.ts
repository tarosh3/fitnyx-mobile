import { supabase } from '@/src/lib/supabase';

// Must mock before importing the modules under test
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { isInviteGateError, _resetAuthInvalidated } = require('../api');
const { registerSession } = require('../api/auth');
const { redeemInviteCode, RedeemError } = require('../api/invites');

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetAuthInvalidated();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { access_token: 'test-jwt-token' } },
    error: null,
  });
});

describe('registerSession invite gate', () => {
  it.each([
    ['INVITE_REQUIRED'],
    ['INVITE_EXPIRED'],
  ])('throws InviteGateError with code %s on 403', async (code) => {
    mockFetch.mockResolvedValue(jsonResponse(403, { error: 'nope', code }));

    let thrown: unknown;
    try {
      await registerSession('some-token');
    } catch (e) {
      thrown = e;
    }
    expect(isInviteGateError(thrown)).toBe(true);
    expect((thrown as { code: string }).code).toBe(code);
  });

  it('throws a plain Error for other failures', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { error: 'Invalid or expired token' }));

    let thrown: unknown;
    try {
      await registerSession('some-token');
    } catch (e) {
      thrown = e;
    }
    expect(isInviteGateError(thrown)).toBe(false);
    expect((thrown as Error).message).toContain('Invalid or expired token');
  });
});

describe('redeemInviteCode', () => {
  it('returns the access window on success', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { access_expires_at: '2026-08-01T00:00:00Z' }));

    const result = await redeemInviteCode('ABCDEF2345');
    expect(result.access_expires_at).toBe('2026-08-01T00:00:00Z');
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/redeem-invite');
    expect(options.headers.Authorization).toBe('Bearer test-jwt-token');
    expect(JSON.parse(options.body)).toEqual({ code: 'ABCDEF2345' });
  });

  it.each([
    [400, 'INVITE_INVALID'],
    [409, 'INVITE_USED'],
    [410, 'INVITE_CODE_EXPIRED'],
    [410, 'INVITE_REVOKED'],
  ])('maps %s %s to a RedeemError with friendly message', async (status, code) => {
    mockFetch.mockResolvedValue(jsonResponse(status, { error: 'raw backend text', code }));

    await expect(redeemInviteCode('ABCDEF2345')).rejects.toMatchObject({
      isRedeemError: true,
      code,
    });
    // Friendly message, not the raw backend text
    await expect(redeemInviteCode('ABCDEF2345')).rejects.not.toThrow('raw backend text');
  });

  it('maps 429 to RATE_LIMITED', async () => {
    mockFetch.mockResolvedValue(jsonResponse(429, { error: 'Rate limit exceeded' }));

    await expect(redeemInviteCode('ABCDEF2345')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('RedeemError is an Error', () => {
    const err = new RedeemError('msg', 'INVITE_USED');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('INVITE_USED');
  });
});

describe('fetchWithAuth invite latch', () => {
  const { fetchWithAuth, isAuthError } = require('../api');

  it('latches on SESSION_EXPIRED when re-registration hits the invite gate, then fast-fails', async () => {
    // 1st call: 401 SESSION_EXPIRED on the endpoint; re-register then 403 INVITE_EXPIRED
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { error: 'expired', code: 'SESSION_EXPIRED' }))
      .mockResolvedValueOnce(jsonResponse(403, { error: 'window over', code: 'INVITE_EXPIRED' }));

    let thrown: unknown;
    try {
      await fetchWithAuth('/dashboard');
    } catch (e) {
      thrown = e;
    }
    expect(isAuthError(thrown)).toBe(true);
    expect((thrown as { reason: string }).reason).toBe('invite_expired');

    // Subsequent calls fast-fail without any network traffic (poll-loop guard).
    const callsBefore = mockFetch.mock.calls.length;
    await expect(fetchWithAuth('/dashboard')).rejects.toMatchObject({ isAuthError: true });
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });

  it('recovers after a successful registerSession clears the latch', async () => {
    // Latch via SESSION_EXPIRED → re-register 403 INVITE_REQUIRED
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { error: 'expired', code: 'SESSION_EXPIRED' }))
      .mockResolvedValueOnce(jsonResponse(403, { error: 'gate', code: 'INVITE_REQUIRED' }));
    await expect(fetchWithAuth('/dashboard')).rejects.toMatchObject({ isAuthError: true });

    // The redeem flow re-registers successfully → latch must clear...
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { session_id: 'new-session-id' }));
    await registerSession('fresh-token');

    // ...so fetchWithAuth goes back to doing real network calls.
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { data: 'welcome back' }));
    await expect(fetchWithAuth('/dashboard')).resolves.toEqual({ data: 'welcome back' });
  });
});
