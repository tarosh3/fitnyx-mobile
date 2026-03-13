import { supabase } from '@/src/lib/supabase';

// Must mock before importing the module under test
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Re-require to pick up fresh mocks
const { fetchWithAuth } = require('../api');

describe('fetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
