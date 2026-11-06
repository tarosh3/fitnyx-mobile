import { parseCompletionArtwork, selectCompletionArtwork } from '../artwork';

const art = { id: 'celebration-v1', screen: 'workout', slot: 'hero', lightUrl: 'https://cdn.example.com/light.png?v=1', darkUrl: 'https://cdn.example.com/dark.png', width: 768, height: 768, enabled: true };
const catalog = (items: unknown[]) => parseCompletionArtwork({ version: 1, items });

it('accepts a versioned PNG catalog and preserves paired theme variants', () => {
  expect(catalog([art]).items).toEqual([art]);
});
it('ignores an unsupported schema and malformed catalogs without breaking the screen', () => {
  for (const raw of [null, {}, { version: 2, items: [art] }, { version: 1, items: Array(41).fill(art) }]) {
    expect(parseCompletionArtwork(raw).items).toEqual([]);
  }
});
it('rejects unsafe URLs, duplicates, malformed entries and oversized or extreme-ratio images', () => {
  const invalid = [null, { ...art, lightUrl: 'http://cdn.example.com/a.png' }, { ...art, darkUrl: 'https://user:secret@cdn.example.com/a.png' }, { ...art, lightUrl: 'https://cdn.example.com/a.svg' }, { ...art, width: 9000 }, { ...art, height: 256 }, { ...art, enabled: 'yes' }, { ...art, slot: 'fullscreen' }];
  expect(catalog(invalid).items).toEqual([]);
  expect(catalog([art, art]).items).toHaveLength(1);
});
it('selects only enabled art for the requested screen and slot, consistently per activity', () => {
  const c = catalog([art, { ...art, id: 'alt' }, { ...art, id: 'off', enabled: false }, { ...art, id: 'roam', screen: 'roam' }, { ...art, id: 'accent', slot: 'accent' }]);
  const selected = selectCompletionArtwork(c, 'workout', 'hero', 'session-123');
  expect(['celebration-v1', 'alt']).toContain(selected?.id);
  expect(selectCompletionArtwork(c, 'workout', 'hero', 'session-123')).toBe(selected);
  expect(selectCompletionArtwork(c, 'roam', 'accent', 'session-123')).toBeUndefined();
  expect(selectCompletionArtwork(undefined, 'workout', 'hero', '')).toBeUndefined();
  expect(selectCompletionArtwork(c, 'roam', 'hero', 'session-123')?.id).toBe('roam');
});
