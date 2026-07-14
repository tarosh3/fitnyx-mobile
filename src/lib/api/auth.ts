import { API_BASE_URL, InviteGateError, _invalidateBackendSessionIdCache, _resetAuthInvalidated } from '@/src/lib/api';
import { secureStorage } from '@/src/lib/secureStorage';
import { supabase } from '@/src/lib/supabase';

const SESSION_ID_KEY = 'fitnyx-session-id';

export async function getAuthToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error('Failed to get auth session');
  }
  if (!data.session?.access_token) {
    throw new Error('Not authenticated');
  }
  return data.session.access_token;
}

/**
 * Register a device session with the backend.
 * This revokes all previous sessions (enforcing single-device login).
 * Returns the session_id which must be sent as X-Session-ID on all requests.
 *
 * When called during early init, pass the already-retrieved accessToken to
 * avoid a second supabase.auth.getSession() call that may race and fail.
 */
export async function registerSession(accessToken?: string): Promise<string> {
  let token = accessToken;
  if (!token) {
    token = await getAuthToken();
  }

  // Token is sent only in the Authorization header — never in the body,
  // to prevent it from appearing in server request logs.
  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  // Safely parse JSON — a proxy/gateway may return an HTML error page (e.g. 502)
  let result: { session_id?: string; error?: string; code?: string } | null = null;
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
  }
  if (!response.ok) {
    // Invite gate: the account has no live access window. Typed so AuthProvider
    // and fetchWithAuth can route to the invite/expired screens.
    if (
      response.status === 403 &&
      (result?.code === 'INVITE_REQUIRED' || result?.code === 'INVITE_EXPIRED')
    ) {
      throw new InviteGateError(result?.error || 'Invite required', result.code);
    }
    throw new Error(result?.error || `API call failed: ${response.statusText}`);
  }
  const sessionId = result?.session_id;
  if (!sessionId) {
    throw new Error('Session registration returned no session_id');
  }
  await secureStorage.setItem(SESSION_ID_KEY, sessionId);
  _invalidateBackendSessionIdCache(sessionId);
  // A live session is back — clear the global auth-invalidation latch so
  // fetchWithAuth stops fast-failing.
  _resetAuthInvalidated();
  return sessionId;
}

/** Get the stored session ID (if any). */
export async function getSessionId(): Promise<string | null> {
  return secureStorage.getItem(SESSION_ID_KEY);
}

/** Clear the stored session ID on logout. */
export async function clearSessionId(): Promise<void> {
  await secureStorage.removeItem(SESSION_ID_KEY);
  _invalidateBackendSessionIdCache(null);
}
