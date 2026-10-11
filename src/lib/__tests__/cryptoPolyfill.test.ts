const mockDigest = jest.fn(async () => new Uint8Array([1, 2, 3]).buffer);
const mockRandom = jest.fn(<T>(a: T) => a);
jest.mock('expo-crypto', () => ({
  digest: (...a: unknown[]) => mockDigest(...(a as [])),
  getRandomValues: (a: unknown) => mockRandom(a),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

describe('cryptoPolyfill', () => {
  const g = globalThis as unknown as { crypto?: unknown };
  let saved: unknown;

  beforeEach(() => {
    saved = g.crypto;
    // React Native has no WebCrypto: simulate that before loading the polyfill.
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    jest.isolateModules(() => {
      require('@/src/lib/cryptoPolyfill');
    });
  });
  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: saved, configurable: true, writable: true });
  });

  it('provides crypto.subtle.digest (SHA-256) and getRandomValues backed by expo-crypto', async () => {
    const c = g.crypto as { subtle: { digest: Function }; getRandomValues: Function };
    const out = await c.subtle.digest('SHA-256', new Uint8Array([9]));
    expect(new Uint8Array(out)).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    const arr = new Uint32Array(4);
    c.getRandomValues(arr);
    expect(mockRandom).toHaveBeenCalledWith(arr);
  });

  it('rejects algorithms it does not implement instead of hashing wrongly', async () => {
    const c = g.crypto as { subtle: { digest: Function } };
    await expect(c.subtle.digest('SHA-1', new Uint8Array([1]))).rejects.toThrow('only supports SHA-256');
  });
});
