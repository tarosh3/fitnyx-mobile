import { isAuthError } from '@/src/lib/api';
import { createDietLog, deleteDietLog, type CreateDietLogInput, type DietLog } from '@/src/lib/api/diet';
import { addToOfflineQueue, getOfflineQueue, updateOfflineQueue } from '@/src/lib/cache/indexeddb';
import { isTransientStatus } from '@/src/lib/offline/syncEngine';
import { itemsTotal } from '../model';

export const LOG_MEAL = 'LOG_MEAL';
export const DELETE_MEAL_LOG = 'DELETE_MEAL_LOG';

/** No HTTP status (never reached the server) or a retryable one. */
function shouldQueue(error: unknown): boolean {
  if (isAuthError(error)) return false;
  const status = (error as { status?: number }).status;
  return status === undefined || isTransientStatus(status);
}

/**
 * Saves a meal. Offline (or on a transient server error) it is queued for the
 * offline sync — idempotent server-side via client_log_id. A 4xx is thrown.
 */
export async function saveMealLog(input: CreateDietLogInput): Promise<'saved' | 'queued'> {
  try {
    await createDietLog(input);
    return 'saved';
  } catch (error) {
    if (!shouldQueue(error)) throw error;
    await addToOfflineQueue({ type: LOG_MEAL, payload: input });
    return 'queued';
  }
}

/** Removes a meal: a still-queued one never reaches the server; otherwise delete (or queue the delete). */
export async function removeMealLog(clientLogId: string): Promise<void> {
  let dropped = false;
  await updateOfflineQueue((queue) => {
    const next = queue.filter((m) => !(m.type === LOG_MEAL && m.payload?.client_log_id === clientLogId));
    dropped = next.length !== queue.length;
    return next;
  });
  if (dropped) return;
  try {
    await deleteDietLog(clientLogId);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return;
    if (!shouldQueue(error)) throw error;
    await addToOfflineQueue({ type: DELETE_MEAL_LOG, payload: { clientLogId } });
  }
}

export interface PendingDietChanges {
  creates: CreateDietLogInput[];
  deletes: Set<string>;
}

export async function pendingDietChanges(): Promise<PendingDietChanges> {
  const queue = await getOfflineQueue().catch(() => []);
  return {
    creates: queue.filter((m) => m.type === LOG_MEAL && m.payload?.client_log_id).map((m) => m.payload as CreateDietLogInput),
    deletes: new Set(queue.filter((m) => m.type === DELETE_MEAL_LOG).map((m) => String(m.payload?.clientLogId))),
  };
}

/** A queued meal shown like a stored one (totals computed the way the backend does). */
export function pendingLog(input: CreateDietLogInput): DietLog {
  const t = itemsTotal(input.items);
  return {
    ...input,
    plan_meal_index: input.plan_meal_index ?? null,
    kcal: Math.round(t.kcal),
    protein_g: Math.round(t.protein * 10) / 10,
    carbs_g: Math.round(t.carbs * 10) / 10,
    fat_g: Math.round(t.fat * 10) / 10,
    created_at: '',
  };
}

/** The day as the user expects to see it: stored logs, minus queued deletes, plus queued meals. */
export function mergeDayLogs(stored: DietLog[], pending: PendingDietChanges, date: string): DietLog[] {
  const kept = stored.filter((l) => !pending.deletes.has(l.client_log_id));
  const known = new Set(kept.map((l) => l.client_log_id));
  const queued = pending.creates
    .filter((c) => c.local_date === date && !known.has(c.client_log_id) && !pending.deletes.has(c.client_log_id))
    .map(pendingLog);
  return [...kept, ...queued];
}
