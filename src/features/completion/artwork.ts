/** Published through app-config. Slots bound layout; artwork never controls app UI. */
export interface CompletionArtwork {
  id: string;
  screen: 'workout' | 'roam';
  slot: 'hero' | 'accent';
  lightUrl: string;
  darkUrl: string;
  width: number;
  height: number;
  enabled: boolean;
}
export interface CompletionArtworkCatalog { version: 1; items: CompletionArtwork[] }

export function isArtworkUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && /\.png$/i.test(url.pathname);
  } catch { return false; }
}

export function parseCompletionArtwork(raw: unknown): CompletionArtworkCatalog {
  const empty: CompletionArtworkCatalog = { version: 1, items: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.items) || r.items.length > 40) return empty;
  const seen = new Set<string>();
  const items: CompletionArtwork[] = [];
  for (const item of r.items) {
    if (!item || typeof item !== 'object') continue;
    const a = item as CompletionArtwork;
    if (typeof a.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(a.id) || seen.has(a.id)) continue;
    if (a.screen !== 'workout' && a.screen !== 'roam') continue;
    if (a.slot !== 'hero' && a.slot !== 'accent') continue;
    if (!isArtworkUrl(a.lightUrl) || !isArtworkUrl(a.darkUrl) || typeof a.enabled !== 'boolean') continue;
    if (!Number.isInteger(a.width) || !Number.isInteger(a.height) || a.width < 256 || a.height < 256 || a.width > 2048 || a.height > 2048) continue;
    if (a.width / a.height < 0.75 || a.width / a.height > 1.5) continue;
    seen.add(a.id);
    items.push({ id: a.id, screen: a.screen, slot: a.slot, lightUrl: a.lightUrl, darkUrl: a.darkUrl, width: a.width, height: a.height, enabled: a.enabled });
  }
  return { version: 1, items };
}

/** Stable for the same activity, including across theme changes and re-renders. */
export function selectCompletionArtwork(catalog: CompletionArtworkCatalog | undefined, screen: CompletionArtwork['screen'], slot: CompletionArtwork['slot'], seed: string) {
  const candidates = catalog?.items.filter(a => a.enabled && a.screen === screen && a.slot === slot) ?? [];
  if (!candidates.length) return undefined;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0;
  return candidates[hash % candidates.length];
}
