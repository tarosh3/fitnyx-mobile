import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/src/features/workouts/ui/Toast';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { healthBackend } from '@/src/lib/health';
import { useHealthSync } from '@/src/lib/prefs';
import { useAuth } from '@/src/providers/AuthProvider';

/**
 * The Home hint that readiness + heart rate exist: shown while health sync is
 * off (they need it) until the user connects or closes it. Without it users
 * couldn't find either feature (reported 2026-11-03).
 */
export function useConnectHealth() {
  const toast = useToast();
  const { user } = useAuth();
  const [syncOn, setSyncOn] = useHealthSync();
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    healthBackend.isAvailable().then(setAvailable).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    cacheGetStale<boolean>(cacheKeys.healthHintDismissed(user.id))
      .then((v) => setDismissed(!!v))
      .catch(() => setDismissed(false));
  }, [user]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    // A year: a per-device convenience, read back stale.
    if (user) cacheSet(cacheKeys.healthHintDismissed(user.id), true, cacheTTL.DAY * 365).catch(() => undefined);
  }, [user]);

  /** Asks for health access and turns sync on; true when it worked. */
  const connect = useCallback(async () => {
    const granted = await healthBackend.requestPermissions().catch(() => false);
    if (!granted) {
      toast(`Allow FitNyx in ${healthBackend.platformLabel || 'Health'} to connect`, 'error');
      return false;
    }
    await setSyncOn(true);
    toast(`Connected to ${healthBackend.platformLabel}`, 'success');
    return true;
  }, [setSyncOn, toast]);

  return { show: available && !syncOn && dismissed === false, label: healthBackend.platformLabel, connect, dismiss };
}
