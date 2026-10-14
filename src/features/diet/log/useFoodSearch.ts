import { useEffect, useRef, useState } from 'react';

import { fetchRecentFoods, searchFoods, type Food, type RecentFood } from '@/src/lib/api/diet';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';

const isOffline = (error: unknown) => !(error as { status?: number })?.status;

/** The user's recent foods (cached, so they work offline) and debounced search of the food list. */
export function useFoodSearch(userId: string | undefined, date: string, query: string) {
  const [recent, setRecent] = useState<RecentFood[]>([]);
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [offline, setOffline] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const key = cacheKeys.dietRecentFoods(userId);
    let live = true;
    cacheGetStale<RecentFood[]>(key).then((cached) => { if (live && cached) setRecent(cached); });
    fetchRecentFoods(date)
      .then((foods) => { if (live) setRecent(foods); return cacheSet(key, foods, cacheTTL.DAY); })
      .catch((e) => { if (live && isOffline(e)) setOffline(true); });
    return () => { live = false; };
  }, [userId, date]);

  useEffect(() => {
    const q = query.trim();
    const id = ++req.current;
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchFoods(q)
        .then((foods) => { if (id === req.current) { setResults(foods); setOffline(false); } })
        .catch((e) => { if (id === req.current && isOffline(e)) setOffline(true); })
        .finally(() => { if (id === req.current) setSearching(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return { recent, results, searching, offline } as const;
}
