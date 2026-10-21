import { useCallback, useState } from 'react';

import { useCachedResource } from '@/src/features/workouts/hooks';
import { getArenaBoard, setArenaPublic, type ArenaBoard, type ArenaBoardKind, type ArenaPeriod, type ArenaScope } from '@/src/lib/api/arena';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { isDefinitelyOffline } from '@/src/lib/network';
import { useAuth } from '@/src/providers/AuthProvider';

/** One leaderboard for the user's local today / this week / all time: last copy at once (also offline), refreshed on focus. */
export function useArenaBoard(board: ArenaBoardKind, scope: ArenaScope, period: ArenaPeriod) {
  const { user } = useAuth();
  const date = localDateKey(new Date());
  return useCachedResource<ArenaBoard>(
    user ? cacheKeys.arenaBoard(user.id, board, scope, period, date) : null,
    () => getArenaBoard(board, scope, period, date),
    cacheTTL.SHORT,
  );
}

/** Joining / leaving the global boards; throws an Error with user-facing text. */
export function useArenaOptIn() {
  const [saving, setSaving] = useState(false);
  const save = useCallback(async (value: boolean) => {
    if (await isDefinitelyOffline()) throw new Error('You’re offline. Try again when you’re connected.');
    setSaving(true);
    try {
      await setArenaPublic(value);
    } catch {
      throw new Error('Couldn’t save that. Try again.');
    } finally {
      setSaving(false);
    }
  }, []);
  return { save, saving };
}
