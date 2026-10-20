import type { UserProfile } from '@/src/lib/api/users';

/** Mirrors the backend's models.UsernameChangeCooldown. */
export const USERNAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** When the next username change is allowed, or null when it is now. The onboarding pick is free. */
export function usernameLockedUntil(
  profile: Pick<UserProfile, 'onboarding_complete' | 'username_changed_at'> | null | undefined,
  now = new Date(),
): Date | null {
  if (!profile?.onboarding_complete || !profile.username_changed_at) return null;
  const until = new Date(new Date(profile.username_changed_at).getTime() + USERNAME_COOLDOWN_MS);
  return Number.isFinite(until.getTime()) && until > now ? until : null;
}

/** "You can change it again in 5 hours" — rounded up, at least 1. */
export function usernameLockedLabel(until: Date, now = new Date()): string {
  const hours = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 3_600_000));
  return `You can change your username once a day. Next change in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
}
