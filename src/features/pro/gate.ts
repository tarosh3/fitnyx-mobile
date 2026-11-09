import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useEntitlement } from '@/src/features/pro/store';

/**
 * For a Pro feature's button: runs `action` for Pro users, opens Get Pro otherwise.
 * `locked` is true only once the plan is known to be free (no lock flash while loading).
 */
export function useProGate() {
  const router = useRouter();
  const { isPro, loaded } = useEntitlement();
  const run = useCallback((action: () => void) => {
    if (isPro) action();
    else router.push('/pro');
  }, [isPro, router]);
  return { isPro, locked: loaded && !isPro, run, openPro: () => router.push('/pro') };
}
