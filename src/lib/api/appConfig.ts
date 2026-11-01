import { API_BASE_URL } from '@/src/lib/api';

// Covers a Render cold start; nothing waits on this call.
const TIMEOUT_MS = 15_000;

/**
 * GET /app-config. Public on purpose (plain fetch, not fetchWithAuth): a forced
 * update or maintenance screen must also reach signed-out users. Returns the raw
 * body — `parseAppConfig` validates it. Throws on network / HTTP errors.
 */
export async function fetchAppConfig(): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/app-config`, { signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error(`app-config ${response.status}`), { status: response.status });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
