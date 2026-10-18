import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useCallback, useEffect, useState } from 'react';

import { FALLBACK_STYLE_URL, PRIMARY_TILEJSON_URL, roamMapStyle } from '@/src/features/roam/mapStyle';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';

type Theme = 'light' | 'dark';
type Mode = 'primary' | 'fallback' | 'none';

// The Roam style ships inside the app, so MapLibre "loads" it even when its
// tile server is down or the phone is offline — and then draws a blank map
// without reporting a failure. So the basemap is chosen up front: OpenFreeMap
// when its TileJSON answers, else VersaTiles (a style URL, whose failure
// MapLibre does report), else none (the caller draws its offline sketch).

const RECHECK_MS = 10 * 60 * 1000;
let verdict: { ok: boolean; at: number } | null = null;

/** Whether OpenFreeMap answers (a public tile host, not our API — plain fetch). Cached for 10 min. */
async function primaryReachable(): Promise<boolean> {
  if (verdict && Date.now() - verdict.at < RECHECK_MS) return verdict.ok;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  let ok = false;
  try {
    ok = (await fetch(PRIMARY_TILEJSON_URL, { signal: ctrl.signal })).ok;
  } catch {
    ok = false;
  } finally {
    clearTimeout(timer);
  }
  verdict = { ok, at: Date.now() };
  return ok;
}

export interface Basemap {
  /** Null: no basemap available — draw the offline sketch. */
  style: StyleSpecification | string | null;
  /** On the backup basemap (Liberty-specific extras like terrain are off). */
  isFallback: boolean;
  /** Remount key: changes when the basemap changes. */
  key: string;
  /** Pass to the Map's onDidFailLoadingMap. */
  onLoadFailed: () => void;
}

export function useBasemap(theme: Theme): Basemap {
  const { isOnline } = useNetworkStatus();
  // Optimistic: the bundled style renders right away while the check runs.
  const [mode, setMode] = useState<Mode>('primary');

  useEffect(() => {
    if (!isOnline) {
      setMode('none');
      return;
    }
    let live = true;
    void primaryReachable().then((ok) => {
      if (live) setMode(ok ? 'primary' : 'fallback');
    });
    return () => {
      live = false;
    };
  }, [isOnline]);

  const onLoadFailed = useCallback(() => {
    setMode((m) => (m === 'primary' ? 'fallback' : 'none'));
  }, []);

  return {
    style: mode === 'none' ? null : mode === 'fallback' ? FALLBACK_STYLE_URL[theme] : roamMapStyle(theme),
    isFallback: mode === 'fallback',
    key: `${mode}-${theme}`,
    onLoadFailed,
  };
}

/** Test hook: forget the cached reachability verdict. */
export function resetBasemapCheck(): void {
  verdict = null;
}
