import { fetchWithAuth } from '@/src/lib/api';

// Mirrors backend service.EntitlementView (internal/entitlement). Change both together.
export interface Entitlement {
  plan: 'free' | 'pro';
  /** When Pro ends; null on free or for a lifetime subscription. */
  pro_until: string | null;
  source?: 'invite' | 'subscription';
  filo: {
    /** 0 = unlimited (Pro). */
    daily_limit: number;
    used_today: number;
    resets_at: string;
  };
}

/** GET /me/entitlement: the user's plan and today's free Filo messages. */
export function getEntitlement(): Promise<Entitlement> {
  return fetchWithAuth('/me/entitlement');
}

/** A request refused because it needs Pro (402 pro_required). */
export function isProRequired(e: unknown): boolean {
  const err = e as { status?: number; code?: string } | null;
  return err?.status === 402 || err?.code === 'pro_required';
}
