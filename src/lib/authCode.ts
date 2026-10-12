import { supabase } from '@/src/lib/supabase';

type ExchangeResult = Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>;

const inflight = new Map<string, Promise<ExchangeResult>>();

/**
 * Exchanges an OAuth / email-link code for a session once. On Android the
 * Google/Facebook redirect reaches both the sign-in form (openAuthSessionAsync)
 * and the /auth/callback route (deep link); each exchanged the same code, the
 * first used up the PKCE verifier and the second showed "PKCE code verifier
 * not found in storage". Both now share one exchange.
 */
export function exchangeCodeOnce(code: string): Promise<ExchangeResult> {
  let pending = inflight.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code);
    inflight.set(code, pending);
  }
  return pending;
}
