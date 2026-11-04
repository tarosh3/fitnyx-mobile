import { AUTH_REQUEST_TIMEOUT_MS, DEADLINE, fetchWithTimeout, withDeadline } from '../deadline';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('withDeadline', () => {
  it('returns the result when it arrives in time', async () => {
    await expect(withDeadline(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('gives up on a promise that never settles', async () => {
    const result = withDeadline(new Promise(() => {}), 1000);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe(DEADLINE);
  });

  it('still reports a rejection', async () => {
    await expect(withDeadline(Promise.reject(new Error('no')), 1000)).rejects.toThrow('no');
  });
});

describe('fetchWithTimeout', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('aborts a request that hangs', async () => {
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
      signal = init?.signal ?? undefined;
      signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    })) as typeof fetch;

    const request = fetchWithTimeout('https://x.test');
    const failure = expect(request).rejects.toThrow('Aborted');
    await jest.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS);
    await failure;
    expect(signal?.aborted).toBe(true);
  });

  it('keeps a signal the caller passed', async () => {
    const mock = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
    global.fetch = mock;
    const { signal } = new AbortController();
    await fetchWithTimeout('https://x.test', { signal });
    expect(mock).toHaveBeenCalledWith('https://x.test', { signal });
  });
});
