import {
  buildCurve,
  buildGhost,
  coordAtDistance,
  distanceAt,
  formatGap,
  raceCandidates,
  raceLine,
  raceState,
  roamEfforts,
  startsNear,
  timeAt,
} from '@/src/features/roam/ghost';
import type { ActivityDetail, ActivitySummary } from '@/src/lib/api/activities';

const splits = (...secs: number[]) => secs.map((sec, i) => ({ km: i + 1, sec }));

describe('buildCurve', () => {
  it('goes through every split and on to the finish', () => {
    expect(buildCurve(splits(300, 310), 2500, 760)).toEqual([[0, 0], [300, 1000], [610, 2000], [760, 2500]]);
  });
  it('works for a Roam under 1 km and stops at a broken split', () => {
    expect(buildCurve([], 800, 240)).toEqual([[0, 0], [240, 800]]);
    expect(buildCurve(splits(300, 0, 300), 3000, 900)).toEqual([[0, 0], [300, 1000], [900, 3000]]);
  });
});

describe('distanceAt / timeAt', () => {
  const curve = buildCurve(splits(300, 310), 2500, 760);
  it('interpolates between km points', () => {
    expect(distanceAt(curve, 150)).toBe(500);
    expect(distanceAt(curve, 455)).toBe(1500);
    expect(timeAt(curve, 1500)).toBe(455);
    expect(timeAt(curve, 2250)).toBe(685);
  });
  it('clamps at both ends', () => {
    expect(distanceAt(curve, -5)).toBe(0);
    expect(distanceAt(curve, 5000)).toBe(2500);
    expect(timeAt(curve, 0)).toBe(0);
    expect(timeAt(curve, 2501)).toBeNull();
  });
});

describe('raceState', () => {
  // Ghost: 5:00 per km for 3 km.
  const ghost = buildCurve(splits(300, 300, 300), 3000, 900);

  it('waits out the first metres', () => {
    expect(raceState(ghost, { distanceM: 30, movingSec: 10, splits: [] })).toEqual({ kind: 'warmup' });
  });
  it('is ahead when there sooner than the ghost', () => {
    // 1200 m in 330 s; the ghost needs 360 s and is at 1100 m.
    const s = raceState(ghost, { distanceM: 1200, movingSec: 330, splits: splits(280) });
    expect(s).toEqual({ kind: 'racing', aheadSec: 30, aheadM: 100, ghostM: 1100 });
    expect(raceLine(s)).toBe('0:30 ahead');
  });
  it('is behind when slower', () => {
    const s = raceState(ghost, { distanceM: 900, movingSec: 300, splits: [] });
    expect(s).toMatchObject({ kind: 'racing', aheadSec: -30, aheadM: -100 });
    expect(raceLine(s)).toBe('0:30 behind');
  });
  it('judges the finish from my own splits', () => {
    // Crossed 3 km at 870 s (splits), then kept going.
    const won = raceState(ghost, { distanceM: 3200, movingSec: 930, splits: splits(290, 290, 290) });
    expect(won).toEqual({ kind: 'done', marginSec: 30 });
    expect(raceLine(won)).toBe('Beat your ghost by 0:30');
    const lost = raceState(ghost, { distanceM: 3000, movingSec: 960, splits: splits(320, 320, 320) });
    expect(lost).toEqual({ kind: 'done', marginSec: -60 });
    expect(raceLine(lost)).toBe('1:00 behind your ghost');
  });
  it('keeps the ghost at its finish once it is done', () => {
    expect(raceState(ghost, { distanceM: 2500, movingSec: 1000, splits: splits(400, 400) })).toMatchObject({ ghostM: 3000 });
  });
});

it('formatGap shows minutes and seconds', () => {
  expect(formatGap(8.4)).toBe('0:08');
  expect(formatGap(-72)).toBe('1:12');
  expect(formatGap(3725)).toBe('1:02:05');
});

describe('ghost on the map', () => {
  const path = { coords: [[77.0, 28.0], [77.001, 28.0], [77.002, 28.0]] as [number, number][], dist: [0, 100, 200] };
  it('finds the point at a distance', () => {
    expect(coordAtDistance(path, 50)).toEqual([77.0005, 28.0]);
    expect(coordAtDistance(path, 999)).toEqual([77.002, 28.0]);
    expect(coordAtDistance({ coords: [], dist: [] }, 10)).toBeNull();
  });
  it('is drawn only when the routes start together', () => {
    expect(startsNear(path, [77.0001, 28.0001])).toBe(true);
    expect(startsNear(path, [77.05, 28.0])).toBe(false);
    expect(startsNear(null, [77, 28])).toBe(false);
    expect(startsNear(path, undefined)).toBe(false);
  });
});

describe('buildGhost', () => {
  it('turns a saved Roam into a ghost with a path', () => {
    const detail = {
      id: 'r1', activity_type: 'run', started_at: '2026-11-03T06:00:00Z', distance_m: 2000, moving_time_sec: 600,
      // [lng, lat] (77, 28) → (77.01, 28) → (77.02, 28)
      route_polyline: '_c`iDo|nuM?o}@?o}@', route_times: [0, 300, 600], vehicle_ranges: [], splits: splits(290, 310),
    } as unknown as ActivityDetail;
    const g = buildGhost(detail, 'Morning Stride');
    expect(g).toMatchObject({ activityId: 'r1', title: 'Morning Stride', type: 'run', distanceM: 2000, movingSec: 600 });
    expect(g.curve).toEqual([[0, 0], [290, 1000], [600, 2000]]);
    expect(g.path?.coords).toHaveLength(3);
    expect(g.path?.dist[2]).toBeCloseTo(2000);
  });
});

it('raceCandidates keeps the same kind, long enough, newest first', () => {
  const a = (id: string, type: string, m: number, at: string) =>
    ({ id, activity_type: type, distance_m: m, moving_time_sec: 100, started_at: at }) as ActivitySummary;
  const list = [
    a('walk', 'walk', 1500, '2026-11-01'), a('run', 'run', 3000, '2026-11-05'), a('ride', 'cycle', 9000, '2026-11-06'),
    a('short', 'run', 150, '2026-11-07'), a('pending-x', 'run', 3000, '2026-11-08'),
  ];
  expect(raceCandidates(list, 'stride').map((x) => x.id)).toEqual(['run', 'walk']);
  expect(raceCandidates(list, 'cycle').map((x) => x.id)).toEqual(['ride']);
});

describe('roamEfforts (same rule as the backend: progress.BestEfforts)', () => {
  it('matches the backend test cases', () => {
    expect(roamEfforts(splits(300, 290, 310, 305, 300), [1, 5, 10])).toEqual([
      { km: 1, sec: 290, fromKm: 1 },
      { km: 5, sec: 1505, fromKm: 0 },
    ]);
    expect(roamEfforts(splits(280, 320, 270), [1])).toEqual([{ km: 1, sec: 270, fromKm: 2 }]);
    expect(roamEfforts(splits(300, 290, 310, 305, 300), [2])).toEqual([{ km: 2, sec: 590, fromKm: 0 }]);
  });
  it('is empty for a Roam under 1 km', () => {
    expect(roamEfforts([])).toEqual([]);
  });
});
