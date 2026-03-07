import { getAuthToken } from '@/src/lib/api/auth';
import { getApiBaseUrl } from '@/src/lib/config/backend';

const API_URL = getApiBaseUrl();

export interface CheckAndLockResponse {
  available: boolean;
  locked: boolean;
  suggestions?: string[];
  error?: string;
}

export async function checkAndLockUsername(
  username: string,
  previousUsername?: string
): Promise<CheckAndLockResponse> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/username/check-and-lock`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      previous_username: previousUsername || '',
    }),
  });

  return response.json();
}

export async function releaseUsername(username: string): Promise<void> {
  const token = await getAuthToken();
  await fetch(`${API_URL}/username/release`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });
}

export async function claimUsername(
  username: string
): Promise<{ status: string; username: string }> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/username/claim`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to claim username');
  }

  return response.json();
}

export async function getUsernameSuggestions(base: string): Promise<{ suggestions: string[] }> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/username/suggestions?base=${encodeURIComponent(base)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}
