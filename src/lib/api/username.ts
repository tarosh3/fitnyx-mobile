import { fetchWithAuth } from '@/src/lib/api';

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
  return fetchWithAuth('/username/check-and-lock', {
    method: 'POST',
    body: JSON.stringify({
      username,
      previous_username: previousUsername || '',
    }),
  });
}

export async function releaseUsername(username: string): Promise<void> {
  await fetchWithAuth('/username/release', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function claimUsername(
  username: string
): Promise<{ status: string; username: string }> {
  return fetchWithAuth('/username/claim', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function getUsernameSuggestions(base: string): Promise<{ suggestions: string[] }> {
  return fetchWithAuth(`/username/suggestions?base=${encodeURIComponent(base)}`);
}
