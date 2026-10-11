import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

// Supabase's PKCE helpers need WebCrypto. React Native has no crypto.subtle
// (and may have no crypto at all), so supabase-js silently fell back to the
// "plain" code-challenge method — the verifier itself sent as the challenge —
// and, without getRandomValues, a Math.random() verifier. Back both with
// expo-crypto (native, already in the app) so OAuth uses S256 with a secure
// random verifier. The web build has real WebCrypto and is left alone.

type MinimalCrypto = {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  subtle?: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

if (Platform.OS !== 'web') {
  const g = globalThis as unknown as { crypto?: MinimalCrypto };
  const c: MinimalCrypto = g.crypto ?? (g.crypto = {});

  if (typeof c.getRandomValues !== 'function') {
    c.getRandomValues = ((array: Parameters<typeof ExpoCrypto.getRandomValues>[0]) =>
      ExpoCrypto.getRandomValues(array)) as MinimalCrypto['getRandomValues'];
  }

  if (!c.subtle || typeof c.subtle.digest !== 'function') {
    c.subtle = {
      digest: (algorithm, data) => {
        const name = String(algorithm).toUpperCase();
        if (name !== 'SHA-256') {
          return Promise.reject(new Error(`crypto.subtle.digest polyfill only supports SHA-256, got ${algorithm}`));
        }
        return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
      },
    };
  }
}
