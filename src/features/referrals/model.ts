import type { ReferralOverview } from '@/src/lib/api/referrals';

// Pure helpers for referrals + Sparks. Code shapes mirror backend internal/referral
// (CodeLength 7, ProCodeLength 10, the same alphabet as Pro codes): change both together.

export const REFERRAL_CODE_LENGTH = 7;
export const PRO_CODE_LENGTH = 10;

/** Uppercase; keep only characters a code can have (A-Z and 2-9, no O/I/L/U). */
export function sanitizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-HJKMNP-TV-Z2-9]/g, '');
}

/** What a typed code is, by its length. */
export function codeKind(code: string): 'referral' | 'pro' | 'other' {
  if (code.length === REFERRAL_CODE_LENGTH) return 'referral';
  if (code.length === PRO_CODE_LENGTH) return 'pro';
  return 'other';
}

/** The message for a failed apply or redeem (the backend's code, else the connection). */
export function referralErrorMessage(e: unknown): string {
  const err = e as { status?: number; code?: string; message?: string } | null;
  if (err?.status === 429) return 'Too many tries. Wait a bit and try again.';
  switch (err?.code) {
    case 'REFERRAL_INVALID': return "No one has that code. Check it with your friend.";
    case 'REFERRAL_IS_PRO_CODE': return "That's a Pro code. Enter it under Get Pro → Pro code.";
    case 'REFERRAL_SELF': return "That's your own code. Share it with friends instead.";
    case 'REFERRAL_ALREADY': return "You've already been referred.";
    case 'REFERRAL_MUTUAL': return "You referred this friend, so they can't refer you.";
    case 'SPARKS_NOT_ENOUGH': return 'Not enough Sparks yet.';
  }
  if (err?.status) return 'Something went wrong. Try again.';
  return "Couldn't reach FitNyx. Check your connection and try again.";
}

/** Sparks toward the next reward: shown count, fraction (0–1) and how many to go. */
export function sparksProgress(o: Pick<ReferralOverview, 'sparks' | 'sparks_per_reward'>) {
  const need = Math.max(1, o.sparks_per_reward);
  const toward = o.sparks >= need ? need : o.sparks;
  return { toward, fraction: toward / need, left: Math.max(0, need - o.sparks), canRedeem: o.sparks >= need };
}

/** "6 of 10 active days" / "Active · Spark earned". */
export function friendLine(f: { active_days: number; qualified: boolean }, needed: number): string {
  return f.qualified ? 'Active · Spark earned' : `${f.active_days} of ${needed} active days`;
}

/** Whether to offer "Referred by a friend?": until the user has entered a code, with no deadline.
 *  `enter_code_until` covers a backend from before `can_enter_code` existed. */
export function canEnterCode(o: Pick<ReferralOverview, 'can_enter_code' | 'enter_code_until' | 'referred_by'>): boolean {
  if (o.referred_by) return false;
  return o.can_enter_code ?? !!o.enter_code_until;
}

/** The text shared with a friend. */
export function shareMessage(code: string): string {
  return `Train with me on FitNyx. Sign up and enter my referral code ${code} under Settings → Refer friends.`;
}
