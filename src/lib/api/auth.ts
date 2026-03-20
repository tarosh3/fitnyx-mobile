import { API_BASE_URL } from '@/src/lib/api';
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
  const result = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(result?.error || `API call failed: ${response.statusText}`);
  }
  const sessionId = result.session_id;
  await secureStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/** Get the stored session ID (if any). */
export async function getSessionId(): Promise<string | null> {
  return secureStorage.getItem(SESSION_ID_KEY);
}

/** Clear the stored session ID on logout. */
export async function clearSessionId(): Promise<void> {
  await secureStorage.removeItem(SESSION_ID_KEY);
}
