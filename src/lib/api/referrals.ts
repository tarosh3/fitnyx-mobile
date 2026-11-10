import { fetchWithAuth } from '@/src/lib/api';

// Mirrors backend service.ReferralOverview / ReferredBy / SparkRedeem
// (referral_service.go, rules in internal/referral). Change both together.
export interface ReferredFriend {
  username: string;
  /** Capped at active_days_needed. */
  active_days: number;
  qualified: boolean;
  joined_at: string;
}

export interface ReferredBy {
  username: string;
  active_days: number;
  qualified: boolean;
}

export interface ReferralOverview {
  /** The user's own code to share (7 characters). */
  code: string;
  sparks: number;
  sparks_per_reward: number;
  reward_days: number;
  active_days_needed: number;
  /** When the user can last enter a friend's code; null when they can't. */
  enter_code_until: string | null;
  referred_by: ReferredBy | null;
  friends: ReferredFriend[];
  friends_total: number;
}

export interface SparkRedeem {
  sparks: number;
  pro_until: string;
  days: number;
}

/** GET /referrals: the user's code, Sparks and referred friends. */
export function getReferrals(): Promise<ReferralOverview> {
  return fetchWithAuth('/referrals');
}

/** POST /referrals/apply: makes the code's owner the user's referrer. */
export function applyReferralCode(code: string): Promise<{ referred_by: ReferredBy }> {
  return fetchWithAuth('/referrals/apply', { method: 'POST', body: JSON.stringify({ code }) });
}

/** POST /referrals/redeem: spends sparks_per_reward Sparks on reward_days of Pro. */
export function redeemSparks(): Promise<SparkRedeem> {
  return fetchWithAuth('/referrals/redeem', { method: 'POST' });
}
