import { API_BASE_URL, fetchWithAuth } from '@/src/lib/api';
import { cacheGetStale, cacheKeys, cacheSet } from '@/src/lib/cache';
import { parseCatalog, type CardCatalog } from './schema';

const KEY = cacheKeys.shareCardCatalog(API_BASE_URL);
export async function cachedCatalog(): Promise<CardCatalog | null> {
  try { return parseCatalog(await cacheGetStale(KEY)); } catch { return null; }
}
export async function refreshCatalog(): Promise<CardCatalog | null> {
  let next: CardCatalog | null;
  try {
    next = parseCatalog(await fetchWithAuth('/share-cards/catalog?schemaVersion=1'));
  } catch { return null; }
  if (!next) return null;
  // No expiry: the next sheet open revalidates; offline opens retain the last publication.
  try { await cacheSet(KEY, next, 0); } catch { /* a failed disk write still shows the fresh catalog */ }
  return next;
}
