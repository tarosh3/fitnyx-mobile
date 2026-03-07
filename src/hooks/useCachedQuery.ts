import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheGet, cacheSet, isStale } from '@/src/lib/cache/cache';

interface UseCachedQueryOptions {
  ttl?: number;
  staleTime?: number;
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseCachedQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  isStale: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {}
): UseCachedQueryResult<T> {
  const {
    ttl = 5 * 60 * 1000,
    staleTime = 30 * 1000,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(
    async (showRefetching = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (showRefetching) {
        setIsRefetching(true);
      }

      try {
        const freshData = await fetcherRef.current();

        if (!isMountedRef.current) return;

        setData(freshData);
        setLastUpdated(Date.now());
        setError(null);
        setIsLoading(false);
        setIsRefetching(false);

        await cacheSet(key, freshData, ttl);
        onSuccess?.(freshData);
      } catch (err) {
        if (!isMountedRef.current) return;
        const wrapped = err instanceof Error ? err : new Error('Unknown error');
        setError(wrapped);
        setIsLoading(false);
        setIsRefetching(false);
        onError?.(wrapped);
      } finally {
        fetchingRef.current = false;
      }
    },
    [key, ttl, onSuccess, onError]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      const cached = await cacheGet<T>(key);
      if (cancelled) return;

      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        setLastUpdated(Date.now());

        if (isStale(key, staleTime)) {
          fetchData(true);
        }
      } else {
        await fetchData();
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [enabled, key, staleTime, fetchData]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefetching,
    isStale: isStale(key, staleTime),
    error,
    refresh,
    lastUpdated,
  };
}

export async function prefetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000): Promise<void> {
  try {
    const data = await fetcher();
    await cacheSet(key, data, ttl);
  } catch {
    // no-op
  }
}
