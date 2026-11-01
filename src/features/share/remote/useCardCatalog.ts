import { useEffect, useState } from 'react';
import { cachedCatalog, refreshCatalog } from './catalog';
import type { CardCatalog } from './schema';

/** The published designs: the saved copy first, then the server's, applied only while no export runs. */
export function useCardCatalog(visible: boolean, busy: boolean): CardCatalog | null {
  const [catalog, setCatalog] = useState<CardCatalog | null>(null);
  const [pending, setPending] = useState<CardCatalog | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      const cached = await cachedCatalog();
      if (!cancelled && cached) setPending(cached);
      const fresh = await refreshCatalog();
      if (!cancelled && fresh) setPending(fresh);
    })();
    return () => { cancelled = true; };
  }, [visible]);
  // Never swap the captured view while an export is in flight.
  useEffect(() => { if (!busy && pending) setCatalog(pending); }, [busy, pending]);

  return catalog;
}
