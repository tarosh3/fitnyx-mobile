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

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('No active session');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach session ID for single-device validation (if registered)
  const sessionId = await secureStorage.getItem(SESSION_ID_KEY);
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
    // Session expired or revoked — try to silently re-register before forcing logout.
    // This handles the 7-day backend expiry without disrupting the user.
    if (response.status === 401 && (body?.code === 'SESSION_REVOKED' || body?.code === 'SESSION_MISSING' || body?.code === 'SESSION_EXPIRED')) {
      await secureStorage.removeItem(SESSION_ID_KEY);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          // Re-register and retry the original request once
          const { registerSession } = await import('@/src/lib/api/auth');
          await registerSession(currentSession.access_token);
          const newSessionId = await secureStorage.getItem(SESSION_ID_KEY);
          if (newSessionId) {
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: { ...headers, 'X-Session-ID': newSessionId } });
            const retryText = await retryResponse.text();
            if (retryResponse.ok) {
              return retryText ? JSON.parse(retryText) : null;
            }
          }
        }
      } catch {
        // Re-registration failed — fall through to sign out
      }
      await supabase.auth.signOut();
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

export async function saveMetric(data: { weight_kg?: number; height_cm?: number; source?: string }) {
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
