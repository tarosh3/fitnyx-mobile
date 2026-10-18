import { parseColor, roamMapStyle } from '@/src/features/roam/mapStyle';
import liberty from '@/src/features/roam/mapStyles/liberty.json';

type AnyLayer = { id: string; type: string; minzoom?: number; paint?: Record<string, unknown>; 'source-layer'?: string };
const layers = (theme: 'light' | 'dark') => roamMapStyle(theme).layers as unknown as AnyLayer[];
const layer = (theme: 'light' | 'dark', id: string) => layers(theme).find((l) => l.id === id)!;
const lightness = (v: unknown) => parseColor(v as string)!.l;

describe('roamMapStyle', () => {
  it('shows points of interest earlier than Liberty, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(layer(theme, 'poi_r1').minzoom).toBe(13);
      expect(layer(theme, 'poi_r7').minzoom).toBe(14.5);
      expect(layer(theme, 'poi_r20').minzoom).toBe(16);
    }
  });

  it('dark keeps every Liberty layer (POIs, transit, 3D buildings) and never edits the source JSON', () => {
    expect(layers('dark').map((l) => l.id)).toEqual(liberty.layers.map((l) => l.id));
    expect(layers('dark').some((l) => l.type === 'fill-extrusion')).toBe(true);
    expect((liberty.layers.find((l) => l.id === 'poi_r1') as AnyLayer).minzoom).toBe(15);
  });

  it('dark: ground is dark, roads read lighter than it, labels are light on dark halos', () => {
    const bg = lightness(layer('dark', 'background').paint!['background-color']);
    expect(bg).toBeLessThan(0.15);
    const roads = layers('dark').filter(
      (l) => l.type === 'line' && l['source-layer'] === 'transportation' && typeof l.paint?.['line-color'] === 'string',
    );
    expect(roads.length).toBeGreaterThan(5);
    for (const r of roads) expect(lightness(r.paint!['line-color'])).toBeGreaterThan(bg);
    const label = layer('dark', 'label_city').paint!;
    expect(lightness(label['text-color'])).toBeGreaterThan(0.6);
    expect(lightness(label['text-halo-color'])).toBeLessThan(0.2);
  });

  it('is built once per theme', () => {
    expect(roamMapStyle('dark')).toBe(roamMapStyle('dark'));
  });
});

describe('parseColor', () => {
  it('reads the colour forms Liberty uses', () => {
    expect(parseColor('#fff')).toMatchObject({ l: 1, a: 1 });
    expect(parseColor('#000000')).toMatchObject({ l: 0 });
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toMatchObject({ h: 0, s: 1, l: 0.5, a: 0.5 });
    expect(parseColor('hsl(205, 56%, 73%)')).toMatchObject({ h: 205, s: 0.56, l: 0.73, a: 1 });
    expect(parseColor('get')).toBeNull();
  });
});
