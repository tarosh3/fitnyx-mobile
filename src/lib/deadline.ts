/** Longest the app waits on Supabase's session lookup before carrying on from the stored session. */
export const AUTH_DEADLINE_MS = 8_000;
/** Longest one Supabase request may hang. A hung DNS lookup or dead connection never fails by itself. */
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export const DEADLINE = Symbol('deadline');

/** The promise's result, or `DEADLINE` if it takes longer than `ms`. The promise keeps running. */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | typeof DEADLINE> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<typeof DEADLINE>((resolve) => {
    timer = setTimeout(() => resolve(DEADLINE), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * fetch for the Supabase client, which sets no timeout of its own. Aborting
 * makes a hung request fail as a retryable network error, which the app's
 * offline paths already handle. Before 2026-11-04 a connected network that
 * couldn't resolve DNS left the app on its loader indefinitely.
 */
export const fetchWithTimeout: typeof fetch = (input, init) => {
  if (init?.signal) return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};
