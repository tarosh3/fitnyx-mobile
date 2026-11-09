import type { Entitlement } from '@/src/lib/api/entitlement';

// Pure helpers for the free / Pro plans (backend internal/entitlement decides).

/** "10 Dec 2026" (no Intl dependency on dates beyond toLocaleDateString). */
export function proUntilText(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** One line for Settings / the Pro screen: "Pro until 10 Dec 2026", "Pro", "Free plan". */
export function planLine(e: Entitlement | null): string {
  if (e?.plan !== 'pro') return 'Free plan';
  const until = proUntilText(e.pro_until);
  return until ? `Pro until ${until}` : 'Pro';
}

/** Free Filo messages left today; null = unlimited or unknown. */
export function filoLeft(e: Entitlement | null): number | null {
  if (!e || e.plan === 'pro' || !e.filo || e.filo.daily_limit <= 0) return null;
  return Math.max(0, e.filo.daily_limit - e.filo.used_today);
}

/** Guided cardio programs open to free users (by id); the rest are Pro. */
export const FREE_CARDIO_COUNT = 3;
