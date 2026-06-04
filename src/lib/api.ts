import { supabase } from '@/src/lib/supabase';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { getApiBaseUrl } from '@/src/lib/config/backend';
import { secureStorage } from '@/src/lib/secureStorage';

export const API_BASE_URL = getApiBaseUrl();

const SESSION_ID_KEY = 'fitnyx-session-id';

// Endpoints that talk to AI services and need a longer timeout than the default 10s.
const LONG_TIMEOUT_ENDPOINTS = ['/agent/', '/diet/generate'];
const DEFAULT_TIMEOUT_MS = 10_000;
const LONG_TIMEOUT_MS = 90_000; // 90s — below the backend's 120s NVIDIA timeout

// Module-scope caches so parallel API calls don't each hit SecureStore.
// Both are invalidated whenever Supabase emits a token refresh / sign-out.
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let cachedBackendSessionId: string | null | undefined; // undefined = not yet loaded
let inflightSessionFetch: Promise<string | null> | null = null;

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
    cachedBackendSessionId = null;
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
      // Refresh failed — fire global auth-failure handler so AuthProvider can
      // wipe state and push the user to /login.
      onAuthFailureCallback?.();
      return null;
    } catch {
      onAuthFailureCallback?.();
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
let onAuthFailureCallback: (() => void) | null = null;
export function _registerAuthFailureHandler(cb: () => void) {
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
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No active session');
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
    // A revoked session means the account logged in on another device. Do NOT
    // re-register here — re-registering would revoke that other device, and the
    // two devices would ping-pong forever (each revoking the other on its next
    // request). Sign out and let the user log in again.
    if (response.status === 401 && body?.code === 'SESSION_REVOKED') {
      await secureStorage.removeItem(SESSION_ID_KEY);
      _invalidateBackendSessionIdCache(null);
      onAuthFailureCallback?.();
    }
    // Session missing (never registered) or expired (the user's own 7-day
    // window lapsed) — try to silently re-register before forcing logout so the
    // user isn't disrupted.
    else if (response.status === 401 && (body?.code === 'SESSION_MISSING' || body?.code === 'SESSION_EXPIRED')) {
      await secureStorage.removeItem(SESSION_ID_KEY);

      // Only auto-retry idempotent methods. Replaying a POST/PUT/PATCH/DELETE can
      // create duplicate sessions, metrics, threads, etc. — let the caller decide.
      const method = (options.method || 'GET').toUpperCase();
      const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          // Re-register so subsequent calls (and this one, if idempotent) succeed.
          const { registerSession } = await import('@/src/lib/api/auth');
          await registerSession(currentSession.access_token);
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
      } catch {
        // Re-registration failed — fall through to sign out
      }
      // For non-idempotent methods we surface the original error so the caller
      // can decide whether to retry (likely with an idempotency key).
      if (isIdempotent) {
        await supabase.auth.signOut();
      }
    }

    const wrapped = new Error(body?.error || `API call failed: ${response.statusText}`) as Error & {
      status?: number;
      data?: any;
      code?: string;
    };
    wrapped.status = response.status;
    wrapped.data = body;
    wrapped.code = body?.code;
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
