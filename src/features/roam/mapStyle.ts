import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

import liberty from '@/src/features/roam/mapStyles/liberty.json';

// The Roam map style: OpenFreeMap's Liberty (free, no API key, no account)
// tuned for a fitness map. Tiles, sprites and fonts still come from
// tiles.openfreemap.org; to switch provider or self-host the same open tiles,
// change the URLs in mapStyles/liberty.json. The attribution ("© OpenMapTiles
// © OpenStreetMap contributors") comes from the tiles and must stay visible.

type Theme = 'light' | 'dark';

/**
 * Backup basemap if OpenFreeMap can't be reached: VersaTiles (free, no key,
 * OpenStreetMap data; a different tile schema, so its own complete styles).
 */
/** OpenFreeMap's TileJSON — answering means the primary basemap's tiles are reachable. */
export const PRIMARY_TILEJSON_URL = (liberty.sources.openmaptiles as { url: string }).url;

export const FALLBACK_STYLE_URL: Record<Theme, string> = {
  light: 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
  dark: 'https://tiles.versatiles.org/assets/styles/colorful-dark/style.json',
};

/** Shaded-relief tiles: Mapterhorn (Copernicus GLO-30, free and open; Terrarium WebP, global to z12). */
export const TERRAIN_TILES = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const TERRAIN_ATTRIBUTION = 'Terrain: Mapterhorn · Copernicus GLO-30 © DLR, Airbus, EU/ESA';

/** Points of interest show this much earlier than in Liberty (rank 1 = most notable). */
const POI_MINZOOM: Record<string, number> = { poi_r1: 13, poi_r7: 14.5, poi_r20: 16 };

const cache: Partial<Record<Theme, StyleSpecification>> = {};

/** The style for a theme (built once, then reused). */
export function roamMapStyle(theme: Theme): StyleSpecification {
  return (cache[theme] ??= buildStyle(theme));
}

function buildStyle(theme: Theme): StyleSpecification {
  const style = JSON.parse(JSON.stringify(liberty)) as StyleSpecification;
  for (const layer of style.layers) {
    if (layer.id in POI_MINZOOM) layer.minzoom = POI_MINZOOM[layer.id];
    if (theme === 'dark') darken(layer as unknown as StyleLayer);
  }
  return style;
}

interface StyleLayer {
  type: string;
  'source-layer'?: string;
  paint?: Record<string, unknown>;
}

/**
 * Dark mode keeps every Liberty layer (points of interest, 3D buildings) by
 * remapping its colours. Lightness is inverted, so text turns light with dark
 * halos and land, water and parks go dark; roads instead get light-to-mid
 * greys so they read above the ground, like dark-mode navigation maps.
 */
function darken(layer: StyleLayer): void {
  const paint = layer.paint;
  if (!paint) return;
  if (layer.type === 'raster') {
    paint['raster-brightness-max'] = 0.35; // Natural Earth relief at world zoom
    return;
  }
  const road = layer.type === 'line' && layer['source-layer'] === 'transportation';
  const map = road ? roadDark : invertDark;
  for (const key of Object.keys(paint)) {
    if (key.endsWith('-color')) paint[key] = mapColors(paint[key], map);
  }
}

// Greens (parks, woods) and blues (water) keep some colour; Liberty's warm
// beige neutrals go almost grey, so the dark map reads neutral, not brown.
const keepsHue = (h: number) => (h >= 75 && h <= 165) || (h >= 185 && h <= 250);

function invertDark({ h, s, l, a }: Hsla): Hsla {
  return { h, s: s * (keepsHue(h) ? 0.55 : 0.12), l: 0.94 - l * 0.85, a };
}

function roadDark({ h, s, l, a }: Hsla): Hsla {
  return { h, s: s * 0.2, l: 0.1 + l * 0.24, a };
}

/** Applies `map` to every colour string inside a paint value (plain or expression). */
function mapColors(value: unknown, map: (c: Hsla) => Hsla): unknown {
  if (typeof value === 'string') {
    const c = parseColor(value);
    return c ? formatColor(map(c)) : value;
  }
  if (Array.isArray(value)) return value.map((v) => mapColors(v, map));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapColors(v, map)]));
  }
  return value;
}

interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

/** Parses #rgb, #rrggbb, rgb(a)() and hsl(a)() — the forms Liberty uses. */
export function parseColor(text: string): Hsla | null {
  const s = text.trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    const n = parseInt(hex, 16);
    return rgbToHsla((n >> 16) & 255, (n >> 8) & 255, n & 255, 1);
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a].every(Number.isFinite) ? rgbToHsla(r, g, b, a) : null;
  }
  m = /^hsla?\(([^)]+)\)$/.exec(s);
  if (m) {
    const [h, sat, l, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
    const out = { h: parseFloat(h), s: parseFloat(sat) / 100, l: parseFloat(l) / 100, a: parseFloat(a) };
    return [out.h, out.s, out.l, out.a].every(Number.isFinite) ? out : null;
  }
  return null;
}

function rgbToHsla(r: number, g: number, b: number, a: number): Hsla {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l, a };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l, a };
}

function formatColor({ h, s, l, a }: Hsla): string {
  const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 1000) / 10}%`;
  return `hsla(${Math.round(h)}, ${pct(s)}, ${pct(l)}, ${Math.round(a * 1000) / 1000})`;
}
