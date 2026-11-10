import { useCachedResource } from '@/src/features/workouts/hooks';
import { getReferrals, type ReferralOverview } from '@/src/lib/api/referrals';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

/** The user's referral code, Sparks and referred friends: saved copy at once, refreshed on focus. */
export function useReferrals() {
  const { user } = useAuth();
  return useCachedResource<ReferralOverview>(user ? cacheKeys.referrals(user.id) : null, getReferrals, cacheTTL.MEDIUM);
}
