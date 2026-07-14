import { API_BASE_URL } from '@/src/lib/api';
import { getAuthToken } from '@/src/lib/api/auth';

/** Redemption failure with a stable backend code for UI branching. */
export class RedeemError extends Error {
  readonly isRedeemError = true;
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'RedeemError';
    this.code = code;
  }
}

const REDEEM_MESSAGES: Record<string, string> = {
  INVITE_INVALID: "That code doesn't look right — check it and try again.",
  INVITE_USED: 'That code has already been used by another account.',
  INVITE_CODE_EXPIRED: "That code's redemption deadline has passed. Ask for a fresh one.",
  INVITE_REVOKED: 'That code is no longer valid. Ask for a fresh one.',
  RATE_LIMITED: 'Too many attempts — wait a few minutes and try again.',
};

/**
 * Redeem an invite code to open (or extend) the access window.
 * Raw fetch on purpose: there is no backend session yet, and fetchWithAuth's
 * invite latch would fast-fail the request.
 */
export async function redeemInviteCode(code: string): Promise<{ access_expires_at: string }> {
  const token = await getAuthToken();
  // Same 10s bound as fetchWithAuth — without it a stalled connection pins the
  // submit button in its loading state until the OS-level timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/redeem-invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  let body: { access_expires_at?: string; error?: string; code?: string } | null = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new RedeemError(REDEEM_MESSAGES.RATE_LIMITED, 'RATE_LIMITED');
    }
    const errCode = body?.code || 'REDEEM_FAILED';
    throw new RedeemError(REDEEM_MESSAGES[errCode] || body?.error || 'Failed to redeem code', errCode);
  }
  if (!body?.access_expires_at) {
    throw new Error('Redemption returned no access window');
  }
  return { access_expires_at: body.access_expires_at };
}
