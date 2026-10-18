import { currentSpeedMps, type RoamPoint } from '@/src/features/roam/geo';
import { buildTimeline, gradientExpression, kmMarkerStep, playbackSeconds, positionAt, rampColor } from '@/src/features/roam/replay';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';

// A straight eastward line near Delhi: n points `stepM` metres apart.
const METRES_PER_DEG_LNG = (6371000 * Math.PI) / 180 * Math.cos((28.6 * Math.PI) / 180);
function line(n: number, stepM: number): LngLatPair[] {
  return Array.from({ length: n }, (_, i) => [77.2 + (i * stepM) / METRES_PER_DEG_LNG, 28.6] as LngLatPair);
}

const RAMP = ['#0000ff', '#ff0000'] as const;

describe('buildTimeline', () => {
  it('replays at the recorded pace, skipping pauses', () => {
    const route = line(5, 10);
    // 4 s per step, then a 5-minute pause before the last point.
    const tl = buildTimeline({ route, routeTimes: [0, 4, 8, 12, 312], distanceM: 40, movingTimeSec: 16 })!;
    expect(tl.timed).toBe(true);
    expect(tl.t).toEqual([0, 4, 8, 12, 13]); // the pause shrinks to 1 s
    expect(tl.dist[4]).toBeCloseTo(40, 5);
    expect(tl.clock[4]).toBeCloseTo(16, 5);
  });

  it('falls back to an even pace without (or with bad) timestamps', () => {
    const route = line(5, 10);
    const even = buildTimeline({ route, distanceM: 40, movingTimeSec: 40 })!;
    expect(even.timed).toBe(false);
    expect(even.t[2]).toBeCloseTo(20, 5);
    const shuffled = buildTimeline({ route, routeTimes: [0, 9, 3, 12, 15], distanceM: 40, movingTimeSec: 40 })!;
    expect(shuffled.timed).toBe(false);
  });

  it('does not count vehicle stretches toward the distance shown', () => {
    const route = line(5, 100);
    const tl = buildTimeline({ route, routeTimes: [0, 30, 60, 70, 100], vehicleRanges: [[1, 3]], distanceM: 200, movingTimeSec: 60 })!;
    expect(tl.vehicle).toEqual([false, false, true, true, false]);
    expect(tl.dist[3]).toBeCloseTo(tl.dist[1], 5); // nothing added while in the vehicle
    expect(tl.dist[4]).toBeCloseTo(200, 5);
  });

  it('marks each whole kilometre', () => {
    const route = line(26, 100); // 2.5 km
    const tl = buildTimeline({ route, distanceM: 2500, movingTimeSec: 900 })!;
    expect(tl.kms.map((k) => k.km)).toEqual([1, 2]);
    expect(tl.kms[0].coord[0]).toBeCloseTo(route[10][0], 6);
  });

  it('needs at least two distinct points', () => {
    expect(buildTimeline({ route: [[77.2, 28.6]], distanceM: 0, movingTimeSec: 0 })).toBeNull();
    expect(buildTimeline({ route: [[77.2, 28.6], [77.2, 28.6]], distanceM: 0, movingTimeSec: 0 })).toBeNull();
  });
});

describe('positionAt', () => {
  const tl = buildTimeline({ route: line(3, 10), routeTimes: [0, 10, 20], distanceM: 20, movingTimeSec: 20 })!;

  it('interpolates between points', () => {
    const p = positionAt(tl, 5);
    expect(p.distanceM).toBeCloseTo(5, 5);
    expect(p.clockSec).toBeCloseTo(5, 5);
    expect(p.speedMps).toBeCloseTo(1, 1);
  });

  it('points the playhead the way the route goes', () => {
    expect(positionAt(tl, 5).bearing).toBeCloseTo(90, 0); // eastward line
    const back = buildTimeline({ route: [...line(3, 10)].reverse(), routeTimes: [0, 10, 20], distanceM: 20, movingTimeSec: 20 })!;
    expect(positionAt(back, 5).bearing).toBeCloseTo(270, 0); // heading back west
    expect(positionAt(tl, 99).bearing).toBeCloseTo(90, 0); // at the end: from behind
  });

  it('clamps to the ends', () => {
    expect(positionAt(tl, -3).distanceM).toBe(0);
    expect(positionAt(tl, 99).distanceM).toBeCloseTo(20, 5);
    expect(positionAt(tl, 99).index).toBe(2);
  });
});

describe('gradientExpression', () => {
  const tl = buildTimeline({ route: line(11, 10), distanceM: 100, movingTimeSec: 60 })!;

  it('draws nothing before the start', () => {
    const e = gradientExpression(tl, 0, RAMP, '#888888');
    expect(e.slice(3)).toEqual([0, 'rgba(0, 0, 0, 0)', 1, 'rgba(0, 0, 0, 0)']);
  });

  it('reveals the line up to the playhead, with strictly ascending stops', () => {
    const e = gradientExpression(tl, 0.5, RAMP, '#888888');
    const stops = e.slice(3).filter((_, i) => i % 2 === 0) as number[];
    stops.forEach((s, i) => i > 0 && expect(s).toBeGreaterThan(stops[i - 1]));
    expect(e[e.length - 1]).toBe('rgba(0, 0, 0, 0)'); // beyond the head
  });

  it('is fully coloured when finished', () => {
    const e = gradientExpression(tl, 1, RAMP, '#888888');
    expect(e).not.toContain('rgba(0, 0, 0, 0)');
  });
});

it('ramps colour from slow to fast', () => {
  const tl = buildTimeline({ route: line(3, 10), routeTimes: [0, 10, 20], distanceM: 20, movingTimeSec: 20 })!;
  expect(rampColor(tl, -100, RAMP)).toBe('rgb(0, 0, 255)');
  expect(rampColor(tl, 100, RAMP)).toBe('rgb(255, 0, 0)');
});

it('keeps replays watchable: short Roams ~15 s, long ones capped at 40 s', () => {
  expect(playbackSeconds(60)).toBe(14);
  expect(playbackSeconds(30 * 60)).toBeGreaterThan(20);
  expect(playbackSeconds(6 * 3600)).toBe(40);
});

describe('currentSpeedMps', () => {
  // A fix every 2 s walking east at `mps`.
  const walk = (n: number, mps: number, seg = 0): RoamPoint[] =>
    Array.from({ length: n }, (_, i) => [28.6, 77.2 + (i * 2 * mps) / METRES_PER_DEG_LNG, i * 2, 5, seg]);

  it('averages the last few seconds of movement', () => {
    expect(currentSpeedMps(walk(10, 3), 18)).toBeCloseTo(3, 1);
  });

  it('is null without a recent fix (GPS lost) and 0 when standing still', () => {
    expect(currentSpeedMps(walk(10, 3), 60)).toBeNull();
    const still: RoamPoint[] = Array.from({ length: 6 }, (_, i) => [28.6, 77.2, i * 2, 5, 0]);
    expect(currentSpeedMps(still, 10)).toBe(0);
  });

  it('reads the GPS speeds when the fixes have them', () => {
    // Positions say 3 m/s; the GPS speed says 4 — trust the GPS.
    const setSpeed = ([lat, lng, t, acc, seg]: RoamPoint, v: number): RoamPoint => [lat, lng, t, acc, seg, v];
    const pts = walk(10, 3).map((p) => setSpeed(p, 4));
    expect(currentSpeedMps(pts, 18)).toBe(4);
    // One bad reading among the latest doesn't move it.
    pts[8] = setSpeed(pts[8], 20);
    expect(currentSpeedMps(pts, 18)).toBe(4);
  });

  it('a shaken phone standing still reads 0', () => {
    // Fix wanders ±6 m inside its 10 m accuracy; GPS speed unknown, or zero.
    for (const speed of [-1, 0]) {
      const drift: RoamPoint[] = Array.from({ length: 8 }, (_, i) => [28.6, 77.2 + (i % 2 ? 6 : 0) / METRES_PER_DEG_LNG, i * 2, 10, 0, speed]);
      expect(currentSpeedMps(drift, 14)).toBe(0);
    }
  });

  it('only looks at the current segment (after a pause)', () => {
    const before = walk(5, 3, 0);
    const after: RoamPoint[] = [[28.6, 77.3, 100, 5, 1]];
    expect(currentSpeedMps([...before, ...after], 101)).toBeNull(); // one fix — not enough yet
  });
});

it('thins km markers on long Roams so the map stays readable', () => {
  expect(kmMarkerStep(5)).toBe(1);
  expect(kmMarkerStep(12)).toBe(1);
  expect(kmMarkerStep(19)).toBe(2);
  expect(kmMarkerStep(42)).toBe(5);
});
