import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getEntitlement, type Entitlement } from '@/src/lib/api/entitlement';
import { cacheGetStale, cacheKeys, cacheSet } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

// One copy of the user's plan for the whole app (every Pro gate reads it), saved
// with no expiry so an offline Pro user stays Pro. Refreshed when first used, on
// return to the foreground (at most every 2 minutes), and after redeeming a code.

interface State {
  userId: string | null;
  entitlement: Entitlement | null;
  /** True once the saved copy or a fetch has answered for this user. */
  loaded: boolean;
}

const REFRESH_MS = 2 * 60 * 1000;
let state: State = { userId: null, entitlement: null, loaded: false };
let lastFetch = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function hydrate(userId: string) {
  if (state.userId === userId) return;
  set({ userId, entitlement: null, loaded: false });
  lastFetch = 0;
  const cached = await cacheGetStale<Entitlement>(cacheKeys.entitlement(userId)).catch(() => null);
  if (state.userId === userId && !state.entitlement) set({ userId, entitlement: cached, loaded: !!cached });
}

/** Fetches the plan now (a failure keeps the saved copy). */
export function refreshEntitlement(): Promise<void> {
  const userId = state.userId;
  if (!userId) return Promise.resolve();
  inflight ??= (async () => {
    try {
      const e = await getEntitlement();
      lastFetch = Date.now();
      if (state.userId !== userId) return;
      set({ userId, entitlement: e, loaded: true });
      await cacheSet(cacheKeys.entitlement(userId), e, 0).catch(() => undefined);
    } catch {
      if (state.userId === userId && !state.loaded) set({ ...state, loaded: true }); // offline, nothing saved: free
    }
  })().finally(() => { inflight = null; });
  return inflight;
}

function refreshIfStale() {
  if (Date.now() - lastFetch > REFRESH_MS) void refreshEntitlement();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => state;

/** Read outside React (e.g. the workout logger's loaders). */
export function isProNow(): boolean {
  return state.entitlement?.plan === 'pro';
}

export interface ProState {
  isPro: boolean;
  entitlement: Entitlement | null;
  loaded: boolean;
  refresh: () => Promise<void>;
}

/** The signed-in user's plan. `loaded` false = not known yet: don't flash a lock. */
export function useEntitlement(): ProState {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const s = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    if (!userId) return;
    void hydrate(userId).then(refreshIfStale);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refreshIfStale(); });
    return () => sub.remove();
  }, [userId]);
  const mine = s.userId === userId;
  const entitlement = mine ? s.entitlement : null;
  return { isPro: entitlement?.plan === 'pro', entitlement, loaded: mine && s.loaded, refresh: refreshEntitlement };
}

/** Shorthand for gates. */
export const useIsPro = () => useEntitlement().isPro;

/** Test helper. */
export function _resetProStore(next: Partial<State> = {}) {
  state = { userId: null, entitlement: null, loaded: false, ...next };
  lastFetch = next.entitlement ? Date.now() : 0;
  inflight = null;
}
