import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useCachedResource } from '@/src/features/workouts/hooks';
import { retentionMetricsKey } from '@/src/hooks/queryKeys';
import { createStarterProgram, getPlan, type Plan } from '@/src/lib/api/plan';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

/** GET /plan: last saved copy at once (also offline), refreshed on focus. */
export function usePlan() {
  const { user } = useAuth();
  return useCachedResource<Plan>(user ? cacheKeys.plan(user.id) : null, getPlan, cacheTTL.LONG);
}

/** Saves the starter program as the active plan and refreshes Home / Train. */
export function useStartStarterProgram() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const start = useCallback(async () => {
    setBusy(true);
    try {
      const plan = await createStarterProgram();
      await queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user?.id) });
      return plan;
    } finally {
      setBusy(false);
    }
  }, [queryClient, user?.id]);
  return { start, busy };
}
