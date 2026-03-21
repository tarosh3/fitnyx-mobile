import { getAllOfflineSessions, getActiveOfflineSessionId } from './offlineStore';
import { getCachedPlan } from '@/src/lib/db';
import { idbGet } from '@/src/lib/cache/indexeddb';
import { cacheKeys } from '@/src/lib/cache/keys';
import { WorkoutPlan } from '@/src/lib/api/workoutPlans';

export const MAX_CUSTOM_PLANS = 2;
export const MAX_SETS_PER_EXERCISE = 20;

export async function canStartSession(): Promise<{ allowed: boolean; reason?: string }> {
  const activeId = await getActiveOfflineSessionId();
  if (activeId) {
    const sessions = await getAllOfflineSessions();
    const activeSession = sessions.find((s) => s.id === activeId);
    if (activeSession && (activeSession.status === 'in_progress' || activeSession.status === 'paused')) {
      return { allowed: false, reason: 'You already have an active workout session.' };
    }
  }
  return { allowed: true };
}

export async function canCreatePlan(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const cached = await idbGet<{ data: WorkoutPlan[] }>(cacheKeys.workoutPlans(userId));
  if (!cached?.data) {
    return { allowed: true };
  }

  const customCount = cached.data.filter((p) => p.source !== 'default' && p.source !== 'system').length;
  if (customCount >= MAX_CUSTOM_PLANS) {
    return { allowed: false, reason: `Maximum of ${MAX_CUSTOM_PLANS} custom plans allowed.` };
  }
  return { allowed: true };
}

export function canAddSet(currentSetCount: number): { allowed: boolean; reason?: string } {
  if (currentSetCount >= MAX_SETS_PER_EXERCISE) {
    return { allowed: false, reason: `Maximum of ${MAX_SETS_PER_EXERCISE} sets per exercise.` };
  }
  return { allowed: true };
}
