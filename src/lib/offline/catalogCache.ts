import { fetchExercises } from '@/src/lib/api/exercises';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import type { Exercise } from '@/src/types/exercise';

/**
 * The whole exercise catalog, cached as one blob so the library can browse and
 * search entirely on the device — instantly and offline. Only the lightweight
 * list fields are fetched (`fields: 'summary'`), so the payload is small text,
 * not media. The user's own custom exercises are merged in so search covers
 * them too.
 */

const PAGE_LIMIT = 100; // backend caps `limit` at 100

async function fetchAllShared(): Promise<Exercise[]> {
  const first = await fetchExercises({ page: 1, limit: PAGE_LIMIT, fields: 'summary' });
  const out = [...(first.data ?? [])];
  const totalPages = first.meta?.total_pages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetchExercises({ page, limit: PAGE_LIMIT, fields: 'summary' });
    if (res.data?.length) out.push(...res.data);
  }
  return out;
}

async function fetchMine(): Promise<Exercise[]> {
  try {
    const res = await fetchExercises({ page: 1, limit: PAGE_LIMIT, fields: 'summary', mine: true });
    return res.data ?? [];
  } catch {
    return [];
  }
}

function mergeByUuid(...lists: Exercise[][]): Exercise[] {
  const seen = new Map<string, Exercise>();
  for (const list of lists) {
    for (const ex of list) {
      if (ex?.uuid && !seen.has(ex.uuid)) seen.set(ex.uuid, ex);
    }
  }
  return [...seen.values()];
}

/** The last-synced catalog (stale is fine — it's just names/muscles/equipment). */
export async function getCatalog(): Promise<Exercise[] | null> {
  return cacheGetStale<Exercise[]>(cacheKeys.exerciseCatalog);
}

/**
 * Refresh the cached catalog from the network. Best-effort: on failure the last
 * cached copy stays. Returns the catalog it ended up with (fresh, or the old
 * cache when offline), or null if there's nothing at all.
 */
export async function syncCatalog(): Promise<Exercise[] | null> {
  try {
    const [shared, mine] = await Promise.all([fetchAllShared(), fetchMine()]);
    const all = mergeByUuid(mine, shared); // customs first so they win on dup uuid
    if (all.length) {
      await cacheSet(cacheKeys.exerciseCatalog, all, cacheTTL.DAY).catch(() => undefined);
      return all;
    }
    return getCatalog();
  } catch {
    return getCatalog();
  }
}
