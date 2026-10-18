import { focusLines, type HeatmapLine } from '@/src/features/roam/useRoamHeatmap';

const line = (id: string, lng: number, lat: number): HeatmapLine => ({
  id,
  type: 'walk',
  coords: [
    [lng, lat],
    [lng + 0.001, lat],
  ],
});

it('frames the Roams near the latest one, not a trip in another city', () => {
  const delhi1 = line('a', 77.165, 28.552); // newest
  const delhi2 = line('b', 77.209, 28.614); // ~8 km away
  const mumbai = line('c', 72.878, 19.076);
  expect(focusLines([delhi1, delhi2, mumbai]).map((l) => l.id)).toEqual(['a', 'b']);
  expect(focusLines([mumbai, delhi1]).map((l) => l.id)).toEqual(['c']);
  expect(focusLines([])).toEqual([]);
});
