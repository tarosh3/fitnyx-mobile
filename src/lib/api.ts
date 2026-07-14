import { supabase } from '@/src/lib/supabase';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { getApiBaseUrl } from '@/src/lib/config/backend';
import { secureStorage } from '@/src/lib/secureStorage';

export const API_BASE_URL = getApiBaseUrl();

const SESSION_ID_KEY = 'fitnyx-session-id';

// Endpoints that talk to AI services and need a longer timeout than the default 10s.
const LONG_TIMEOUT_ENDPOINTS = ['/agent/', '/diet/generate'];
const DEFAULT_TIMEOUT_MS = 10_000;
// Must sit ABOVE the backend's NVIDIA client timeout (180s) — otherwise the app
// aborts mid-generation and cancels the backend's request context (a large diet
// plan can take ~90-150s to generate), surfacing a spurious failure.
const LONG_TIMEOUT_MS = 190_000;

// Module-scope caches so parallel API calls don't each hit SecureStore.
// Both are invalidated whenever Supabase emits a token refresh / sign-out.
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let cachedBackendSessionId: string | null | undefined; // undefined = not yet loaded
let inflightSessionFetch: Promise<string | null> | null = null;

// --- Global auth-invalidation latch ------------------------------------------
// Flipped when the backend tells us the session is gone for good — revoked by a
// login on another device, or our Supabase refresh token is dead. Once set,
// every fetchWithAuth fails fast and quiet (no network, no per-caller error log)
// instead of each provider independently hitting a 401 and logging its own error.
// Cleared on the next successful registerSession (api/auth.ts) or local SIGNED_OUT.
export type AuthFailureReason = 'session_revoked' | 'expired' | 'invite_required' | 'invite_expired';

let authInvalidated = false;
let authFailureReason: AuthFailureReason | null = null;

/** Error thrown for any "the user is signed out" condition. Callers should bail quietly. */
export class AuthError extends Error {
  readonly isAuthError = true;
  code: string;
  reason: AuthFailureReason | null;
  constructor(message: string, code: string, reason: AuthFailureReason | null = null) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.reason = reason;
  }
}

/** True for any error meaning the session is gone — callers use this to skip error logging. */
export function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof AuthError ||
    (typeof error === 'object' && error !== null && (error as { isAuthError?: boolean }).isAuthError === true)
  );
}

/**
 * Thrown by registerSession when the backend refuses to create a session
 * because the user has no live invite-access window (403 INVITE_REQUIRED /
 * INVITE_EXPIRED). Defined here (not api/auth.ts) so fetchWithAuth can detect
 * it without an import cycle.
 */
export class InviteGateError extends Error {
  readonly isInviteGateError = true;
  code: 'INVITE_REQUIRED' | 'INVITE_EXPIRED';
  constructor(message: string, code: 'INVITE_REQUIRED' | 'INVITE_EXPIRED') {
    super(message);
    this.name = 'InviteGateError';
    this.code = code;
  }
}

export function isInviteGateError(error: unknown): error is InviteGateError {
  return (
    error instanceof InviteGateError ||
    (typeof error === 'object' && error !== null && (error as { isInviteGateError?: boolean }).isInviteGateError === true)
  );
}

/** Cleared by api/auth.ts after a successful (re)registration restores a live session. */
export function _resetAuthInvalidated() {
  authInvalidated = false;
  authFailureReason = null;
  authFailureRedirectSuppressed = false;
}

// Set by deliberate sign-out flows (account deletion) before the backend revokes
// all sessions. Concurrent in-flight calls then 401 with SESSION_REVOKED; without
// this latch the global handler would race the flow's own signOut() and land the
// user on /login?reason=session_revoked ("logged in elsewhere") right after they
// deleted their account. Cleared on SIGNED_OUT, on registerSession, or explicitly
// with `false` when the flow fails before signing out.
let authFailureRedirectSuppressed = false;
export function _suppressAuthFailureRedirect(suppress: boolean = true) {
  authFailureRedirectSuppressed = suppress;
}

// Centralizes the one-time sign-out trigger. Re-entrant calls only re-wipe the
// cheap caches; the redirect/sign-out side effect fires exactly once per outage.
function invalidateAuth(reason: AuthFailureReason) {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
  cachedBackendSessionId = null;
  // Best-effort durable wipe so a relaunch doesn't replay the dead session id.
  secureStorage.removeItem(SESSION_ID_KEY).catch(() => undefined);
  if (authInvalidated) return;
  authInvalidated = true;
  authFailureReason = reason;
  if (!authFailureRedirectSuppressed) {
    onAuthFailureCallback?.(reason);
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
    cachedBackendSessionId = null;
    authInvalidated = false;
    authFailureReason = null;
    authFailureRedirectSuppressed = false;
    return;
  }
  if (session?.access_token) {
    cachedAccessToken = session.access_token;
    cachedAccessTokenExpiresAt = (session.expires_at ?? 0) * 1000;
  }
});

async function getAccessToken(): Promise<string | null> {
  // Use the in-memory token if it's still valid for at least 30 more seconds.
  // Avoids the SecureStore decrypt cost on every API call.
  if (cachedAccessToken && cachedAccessTokenExpiresAt - Date.now() > 30_000) {
    return cachedAccessToken;
  }
  if (inflightSessionFetch) return inflightSessionFetch;
  inflightSessionFetch = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        cachedAccessToken = session.access_token;
        cachedAccessTokenExpiresAt = (session.expires_at ?? 0) * 1000;
        return session.access_token;
      }
      // Stored session is gone — try one forced refresh before giving up.
      const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
      if (!error && refreshed?.access_token) {
        cachedAccessToken = refreshed.access_token;
        cachedAccessTokenExpiresAt = (refreshed.expires_at ?? 0) * 1000;
        return refreshed.access_token;
      }
      // Refresh failed — our own session is dead. Latch + push to /login.
      invalidateAuth('expired');
      return null;
    } catch {
      invalidateAuth('expired');
      return null;
    } finally {
      inflightSessionFetch = null;
    }
  })();
  return inflightSessionFetch;
}

// Exposed so api/auth.ts can reset the cache after register/clear
export function _invalidateBackendSessionIdCache(next?: string | null) {
  cachedBackendSessionId = next === undefined ? undefined : next;
}

// AuthProvider registers a callback so we can trigger a forced sign-out from
// deep inside fetchWithAuth without circular imports.
let onAuthFailureCallback: ((reason?: AuthFailureReason) => void) | null = null;
export function _registerAuthFailureHandler(cb: (reason?: AuthFailureReason) => void) {
  onAuthFailureCallback = cb;
}

async function getBackendSessionId(): Promise<string | null> {
  if (cachedBackendSessionId !== undefined) return cachedBackendSessionId;
  try {
    const id = await secureStorage.getItem(SESSION_ID_KEY);
    cachedBackendSessionId = id;
    return id;
  } catch {
    cachedBackendSessionId = null;
    return null;
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Auth already known-dead — fail fast and quiet, no network, no per-caller log.
  if (authInvalidated) {
    throw new AuthError('No active session', 'AUTH_INVALIDATED', authFailureReason);
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    // getAccessToken already latched via invalidateAuth() when the refresh failed.
    throw new AuthError('No active session', 'NO_SESSION', authFailureReason);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach session ID for single-device validation (if registered)
  const sessionId = await getBackendSessionId();
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  // Use a longer timeout for AI/diet endpoints that wait on upstream model inference.
  const isLongRequest = LONG_TIMEOUT_ENDPOINTS.some((p) => endpoint.startsWith(p));
  const timeoutMs = isLongRequest ? LONG_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();

  // Safely parse JSON — backend may return plain-text or HTML error pages
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML error page, plain text)
      if (!response.ok) {
        const wrapped = new Error(`API call failed: ${response.status} ${response.statusText}`) as Error & {
          status?: number;
          data?: any;
          code?: string;
        };
        wrapped.status = response.status;
        wrapped.data = text;
        throw wrapped;
      }
      // 2xx with non-JSON body — return the raw text
      return text;
    }
  }

  if (!response.ok) {
    const code: string | undefined = body?.code;

    // Session revoked = the account logged in on another device. Do NOT
    // re-register (that revokes the other device and the two ping-pong, each
    // revoking the other on its next request). Latch, sign out once, and throw a
    // typed AuthError so every in-flight caller bails quietly.
    if (response.status === 401 && code === 'SESSION_REVOKED') {
      invalidateAuth('session_revoked');
      throw new AuthError(
        body?.error || 'Session revoked. You may be logged in on another device.',
        code,
        'session_revoked',
      );
    }

    // Session missing (never registered) or expired (the user's own 7-day window
    // lapsed) — try to silently re-register before forcing logout.
    if (response.status === 401 && (code === 'SESSION_MISSING' || code === 'SESSION_EXPIRED')) {
      // If auth is already invalidated (e.g. a revoke just wiped our session id),
      // do NOT re-register — that would resurrect a revoked device. Fail quiet.
      if (authInvalidated) {
        throw new AuthError(body?.error || 'Signed out', code, authFailureReason);
      }

      await secureStorage.removeItem(SESSION_ID_KEY);
      _invalidateBackendSessionIdCache(null);

      // Only auto-retry idempotent methods. Replaying a POST/PUT/PATCH/DELETE can
      // create duplicate sessions, metrics, threads, etc. — let the caller decide.
      const method = (options.method || 'GET').toUpperCase();
      const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

      let reRegistered = false;
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          // Re-register so subsequent calls (and this one, if idempotent) succeed.
          // Lazy require (not import()) — avoids the static circular import
          // with api/auth.ts and, unlike native dynamic import, runs under
          // jest without --experimental-vm-modules.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { registerSession } = require('@/src/lib/api/auth') as typeof import('@/src/lib/api/auth');
          await registerSession(currentSession.access_token);
          reRegistered = true;
          const newSessionId = await secureStorage.getItem(SESSION_ID_KEY);

          if (isIdempotent && newSessionId) {
            const retryController = new AbortController();
            const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);
            try {
              const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: { ...headers, 'X-Session-ID': newSessionId },
                signal: retryController.signal,
              });
              const retryText = await retryResponse.text();
              if (retryResponse.ok) {
                if (!retryText) return null;
                try {
                  return JSON.parse(retryText);
                } catch {
                  return retryText;
                }
              }
            } finally {
              clearTimeout(retryTimeout);
            }
          }
        }
      } catch (reRegisterError) {
        // The gate refused a new session: without this latch every poller
        // (WorkoutProvider etc.) would loop re-register → 403 forever.
        if (isInviteGateError(reRegisterError)) {
          const reason: AuthFailureReason =
            reRegisterError.code === 'INVITE_EXPIRED' ? 'invite_expired' : 'invite_required';
          invalidateAuth(reason);
          throw new AuthError(reRegisterError.message, reRegisterError.code, reason);
        }
        reRegistered = false;
      }

      if (!reRegistered) {
        // Couldn't recover the session at all — the user is genuinely signed out.
        invalidateAuth('expired');
        throw new AuthError(body?.error || 'Session expired. Please log in again.', code, 'expired');
      }
      // Re-registered, but this was a non-idempotent call we didn't replay (or an
      // idempotent retry that still failed). The user is still logged in — fall
      // through to a normal retryable error so the caller can decide to retry.
    }

    const wrapped = new Error(body?.error || `API call failed: ${response.statusText}`) as Error & {
      status?: number;
      data?: any;
      code?: string;
    };
    wrapped.status = response.status;
    wrapped.data = body;
    wrapped.code = code;
    throw wrapped;
  }

  return body;
}

export interface SaveMetricInput {
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  measurements?: Record<string, number>;
  notes?: string;
  source?: string;
}

export async function saveMetric(data: SaveMetricInput) {
  return fetchWithAuth('/metrics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMetricsHistory() {
  return fetchWithAuth('/metrics');
}

export async function fetchLatestMetric() {
  return fetchWithAuth('/metrics/latest');
}

export async function deleteMetric(id: string) {
  return fetchWithAuth(`/metrics/${id}`, { method: 'DELETE' });
}

export interface DietFoodItem {
  dish: string;
  descriptor?: string;
  composition?: {
    base?: string;
    protein?: string;
    veggies?: string;
    flavor?: string;
    fat?: string;
    extras?: string;
  };
  ingredients?: string[];
}

export interface DietPlan {
  id: string;
  user_id: string;
  plan_data: {
    summary: string;
    total_calories: number;
    macros: { protein: string; carbs: string; fats: string };
    meals: {
      name: string;
      time: string;
      items: Array<DietFoodItem | string>;
      alternatives?: Array<DietFoodItem | string>;
      calories: number;
      macros: { p: string; c: string; f: string };
    }[];
  };
  preferences: any;
  created_at: string;
}

/** Returns a user-scoped cache key so diet plans don't leak across accounts. */
function dietCacheKey(userId: string): string {
  return `diet-plan:${userId}`;
}

export async function getDietPlan(userId: string): Promise<DietPlan> {
  const key = dietCacheKey(userId);
  const cached = await idbGet<DietPlan>(key);
  if (cached) return cached;

  const plan = await fetchWithAuth('/diet');
  if (plan?.id) {
    await idbSet(key, plan, 24 * 60 * 60 * 1000);
  }
  return plan;
}

export async function generateDietPlan(userId: string, preferences: any): Promise<DietPlan> {
  const key = dietCacheKey(userId);
  const generated = await fetchWithAuth('/diet/generate', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  });

  if (generated?.id) {
    await idbSet(key, generated, 24 * 60 * 60 * 1000);
  }

  return generated;
}
