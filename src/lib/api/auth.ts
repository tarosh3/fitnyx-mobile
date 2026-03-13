import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchWithAuth } from '@/src/lib/api';
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
 */
export async function registerSession(): Promise<string> {
  const result = await fetchWithAuth('/auth/session', { method: 'POST' });
  const sessionId = result.session_id;
  await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/** Get the stored session ID (if any). */
export async function getSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_ID_KEY);
}

/** Clear the stored session ID on logout. */
export async function clearSessionId(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_ID_KEY);
}
