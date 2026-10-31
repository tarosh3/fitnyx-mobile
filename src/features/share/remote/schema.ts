import { ART_SUBJECTS, artworkSubject, type ArtworkAppearance, type ArtworkSubject } from '../artwork';
import type { ShareCardData } from '../cardData';

/** Version 1 is a data format, never downloaded JavaScript, HTML or executable SVG. */
export type BlockType = 'text' | 'metric' | 'stats' | 'artwork' | 'image' | 'brand' | 'rule' | 'shape' | 'route';
export type Binding = 'title' | 'kicker' | 'date' | 'time' | 'hero.label' | 'fact' | 'badge';
export interface ImageVariant { url: string; appearance?: ArtworkAppearance; subject?: ArtworkSubject }
export interface CardBlock {
  type: BlockType;
  x: number; y: number; width: number; height: number;
  color?: string; size?: number;
  text?: string; binding?: Binding; font?: 'hand' | 'sans'; align?: 'left' | 'center' | 'right';
  url?: string; variants?: ImageVariant[]; radius?: number;
}
export interface CardLayout { background: string; blocks: CardBlock[] }
export interface RemoteTemplate {
  id: string; label: string; description: string;
  kinds: ShareCardData['kind'][];
  layouts: { story: CardLayout; post: CardLayout };
}
export interface CardCatalog { schemaVersion: 1; revision: number; templates: RemoteTemplate[] }
const bindings = ['title', 'kicker', 'date', 'time', 'hero.label', 'fact', 'badge'];
const blockTypes = ['text', 'metric', 'stats', 'artwork', 'image', 'brand', 'rule', 'shape', 'route'];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const bounded = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const string = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.length >= min && v.length <= max;
const color = (v: unknown) => typeof v === 'string' && /^#[a-fA-F0-9]{6}$/.test(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
export function assetURL(v: unknown): v is string {
  if (!string(v, 1, 2048)) return false;
  try { const u = new URL(v); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password && /\.(png|jpe?g|webp)$/i.test(u.pathname); } catch { return false; }
}
function validVariant(v: unknown) {
  return object(v) && keys(v, ['url', 'appearance', 'subject']) && assetURL(v.url)
    && (v.appearance === undefined || ['equipment', 'woman', 'man'].includes(v.appearance as string))
    && (v.subject === undefined || ART_SUBJECTS.includes(v.subject as ArtworkSubject));
}
function validBlock(v: unknown, height: number): boolean {
  if (!object(v) || !keys(v, ['type','x','y','width','height','color','size','text','binding','font','align','url','variants','radius'])) return false;
  if (!blockTypes.includes(v.type as string) || !bounded(v.x, 0, 360) || !bounded(v.y, 0, height)
    || !bounded(v.width, 1, 360) || !bounded(v.height, 1, height) || v.x + v.width > 360 || v.y + v.height > height) return false;
  if (v.color !== undefined && !color(v.color)) return false;
  if (v.size !== undefined && !bounded(v.size, 8, 110)) return false;
  if (v.radius !== undefined && !bounded(v.radius, 0, 180)) return false;
  if (v.text !== undefined && !string(v.text, 0, 180)) return false;
  if (v.binding !== undefined && !bindings.includes(v.binding as string)) return false;
  if (v.font !== undefined && !['hand', 'sans'].includes(v.font as string)) return false;
  if (v.align !== undefined && !['left', 'center', 'right'].includes(v.align as string)) return false;
  if (v.url !== undefined && !assetURL(v.url)) return false;
  if (v.variants !== undefined && (!Array.isArray(v.variants) || v.variants.length > 36 || !v.variants.every(validVariant))) return false;
  if (v.type === 'image' && !assetURL(v.url)) return false;
  if (v.type === 'text' && ((v.text === undefined) === (v.binding === undefined) || v.height < (v.size as number ?? 18) * 1.35)) return false;
  if (v.type === 'metric' && v.height < (v.size as number ?? 72) * 1.16) return false;
  if (v.type === 'stats' && (v.width < 260 || v.height < 60)) return false;
  if (v.type === 'route' && (v.width < 32 || v.height < 32)) return false;
  if (v.type === 'brand' && (v.width < 100 || v.height < 32 || (v.size as number ?? 20) > 24)) return false;
  return true;
}
function validLayout(v: unknown, height: number): boolean {
  if (!object(v) || !keys(v, ['background', 'blocks']) || !color(v.background) || !Array.isArray(v.blocks) || v.blocks.length < 1 || v.blocks.length > 24) return false;
  return v.blocks.every(b => validBlock(b, height))
    && v.blocks.some(b => b.type === 'brand') && v.blocks.some(b => b.type === 'metric')
    && v.blocks.filter(b => b.type === 'image' || b.type === 'artwork').length <= 4;
}
/** Reject the entire publication on malformed data; keep the last known good catalog. */
export function parseCatalog(v: unknown): CardCatalog | null {
  if (!object(v) || !keys(v, ['schemaVersion','revision','templates']) || v.schemaVersion !== 1 || !Number.isSafeInteger(v.revision) || !bounded(v.revision, 0, Number.MAX_SAFE_INTEGER) || !Array.isArray(v.templates) || v.templates.length > 20) return null;
  const ids = new Set<string>();
  for (const t of v.templates) {
    if (!object(t) || !keys(t, ['id','label','description','kinds','layouts']) || !string(t.id,1,48) || !/^[a-z][a-z0-9-]*$/.test(t.id) || ids.has(t.id)
      || !string(t.label,1,24) || !string(t.description,0,120) || !Array.isArray(t.kinds) || !t.kinds.length || t.kinds.length > 2
      || !t.kinds.every(k => k === 'workout' || k === 'roam') || new Set(t.kinds).size !== t.kinds.length
      || !object(t.layouts) || !keys(t.layouts, ['story','post']) || !validLayout(t.layouts.story,640) || !validLayout(t.layouts.post,450)) return null;
    ids.add(t.id);
  }
  return v as unknown as CardCatalog;
}
export function boundText(binding: Binding, data: ShareCardData): string {
  return binding === 'hero.label' ? data.hero.label : data[binding] ?? '';
}
/** More-specific artwork wins; ties retain the order chosen by the publisher. */
export function imageURL(block: CardBlock, data: ShareCardData): string {
  const appearance = data.artworkAppearance ?? 'equipment';
  const subject = data.artworkSubject ?? artworkSubject(data);
  let url = block.url!, score = -1;
  for (const v of block.variants ?? []) {
    if ((v.appearance && v.appearance !== appearance) || (v.subject && v.subject !== subject)) continue;
    const specificity = Number(!!v.appearance) + Number(!!v.subject);
    if (specificity > score) { url = v.url; score = specificity; }
  }
  return url;
}
