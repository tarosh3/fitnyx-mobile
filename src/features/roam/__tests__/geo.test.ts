import {
  computeStats,
  decodePolyline,
  formatDistance,
  formatDuration,
  formatDurationHuman,
  formatSpeed,
  type ActivityType,
  type RoamPoint,
} from '@/src/features/roam/geo';

// Mirrors backend internal/activity/metrics_test.go: a synthetic eastward
// track whose geometry uses the same Earth radius as haversine.
class Track {
  pts: RoamPoint[] = [];
  lat = 19.076;
  lng = 72.8777;
  t = 0;
  seg = 0;

  east(m: number) {
    const metresPerDeg = (6371000 * Math.PI) / 180;
    this.lng += m / (metresPerDeg * Math.cos((this.lat * Math.PI) / 180));
  }

  add(acc = 5) {
    this.pts.push([this.lat, this.lng, this.t, acc, this.seg]);
  }

  move(v: number, dt: number, n: number) {
    if (this.pts.length === 0) this.add();
    for (let i = 0; i < n; i++) {
      this.t += dt;
      this.east(v * dt);
      this.add();
    }
    return this;
  }
}

const stats = (tr: Track, type: ActivityType) => computeStats(tr.pts, type);

describe('max speed (mirrors metrics_test.go)', () => {
  it('works with ~2 s phone fixes and is never below the average', () => {
    const s = stats(new Track().move(3, 2, 150).move(4.5, 2, 30).move(3, 2, 150), 'run');
    expect(s.maxSpeedMps).toBeCloseTo(4.5, 1);
    expect(s.maxSpeedMps).toBeGreaterThanOrEqual(s.avgSpeedMps);
  });

  it('is not set by one noisy fix', () => {
    const s = stats(new Track().move(3, 2, 100).move(6.5, 2, 1).move(3, 2, 100), 'run');
    expect(s.maxSpeedMps).toBeLessThan(3.8);
  });
});

describe('computeStats (mirrors backend rules)', () => {
  it('steady 5 km run: distance, moving time, splits, pace', () => {
    const s = stats(new Track().move(3, 3, 556), 'run');
    expect(s.distanceM).toBeCloseTo(5004, -1);
    expect(s.movingTimeSec).toBe(1668);
    expect(s.splits).toHaveLength(5);
    s.splits.forEach((sp) => expect(Math.abs(sp.sec - 333)).toBeLessThanOrEqual(1));
    expect(s.avgPaceSecPerKm).toBe(333);
    expect(s.vehicleDetected).toBe(false);
    expect(s.xpEligible).toBe(true);
  });

  it('excludes a car ride from a walk and marks it ineligible', () => {
    const tr = new Track().move(1.4, 5, 143);
    tr.move(15, 5, 67);
    tr.move(1.4, 5, 143);
    const s = stats(tr, 'walk');
    expect(Math.abs(s.distanceM - 2002)).toBeLessThan(10);
    expect(Math.abs(s.vehicleDistanceM - 5025)).toBeLessThan(20);
    expect(s.vehicleDetected).toBe(true);
    expect(s.xpEligible).toBe(false);
    expect(s.vehicleRanges).toHaveLength(1);
  });

  it('a fast cyclist is not a vehicle, but the same speed on foot is', () => {
    expect(stats(new Track().move(8.9, 2, 600), 'cycle').vehicleDetected).toBe(false);
    const onFoot = new Track().move(3, 3, 100);
    onFoot.move(8.9, 3, 20);
    onFoot.move(3, 3, 100);
    expect(stats(onFoot, 'run').vehicleDetected).toBe(true);
  });

  it('a metro ride with no signal underground is a vehicle', () => {
    const tr = new Track().move(3, 3, 222);
    tr.t += 240;
    tr.east(3000);
    tr.add();
    tr.move(3, 3, 111);
    const s = stats(tr, 'run');
    expect(s.vehicleDetected).toBe(true);
    expect(Math.abs(s.distanceM - 2997)).toBeLessThan(15);
  });

  it('a single GPS spike is ignored, not flagged', () => {
    const tr = new Track().move(3, 3, 200);
    tr.t += 3;
    tr.east(400);
    tr.add(10);
    tr.east(-400 + 9);
    tr.t += 3;
    tr.add();
    tr.move(3, 3, 100);
    const s = stats(tr, 'run');
    expect(s.vehicleDetected).toBe(false);
    expect(Math.abs(s.distanceM - 2700)).toBeLessThan(15);
  });

  it('a phone standing still does not accumulate distance', () => {
    const tr = new Track();
    for (let i = 0; i < 200; i++) {
      tr.t += 3;
      tr.east(i % 2 === 0 ? -2 : 2);
      tr.add();
    }
    const s = stats(tr, 'walk');
    expect(s.distanceM).toBeLessThan(10);
    expect(s.movingTimeSec).toBe(0);
  });

  it('does not bridge a pause', () => {
    const tr = new Track().move(3, 3, 100);
    tr.seg++;
    tr.t += 600;
    tr.east(500);
    tr.add();
    tr.move(3, 3, 100);
    const s = stats(tr, 'run');
    expect(Math.abs(s.distanceM - 1800)).toBeLessThan(5);
    expect(s.movingTimeSec).toBe(600);
    expect(s.vehicleDetected).toBe(false);
  });

  it('shows the live vehicle banner once fast movement is sustained', () => {
    const tr = new Track().move(3, 3, 50);
    tr.move(15, 3, 3); // 9 s fast — not yet
    expect(stats(tr, 'run').inVehicleNow).toBe(false);
    tr.move(15, 3, 5); // 24 s fast
    expect(stats(tr, 'run').inVehicleNow).toBe(true);
  });
});

describe('GPS speed + drift (mirrors metrics_test.go)', () => {
  const setSpeed = ([lat, lng, t, acc, seg]: RoamPoint, v: number): RoamPoint => [lat, lng, t, acc, seg, v];
  const withSpeed = (tr: Track, v: number, from = 0) => {
    for (let i = from; i < tr.pts.length; i++) tr.pts[i] = setSpeed(tr.pts[i], v);
    return tr;
  };

  it('a shaken phone standing still does not accumulate distance', () => {
    for (const speed of [-1, 0]) {
      const tr = new Track();
      for (let i = 0; i < 150; i++) {
        tr.t += 2;
        tr.east(i % 2 === 0 ? 6 : -6);
        tr.add(10);
      }
      const s = stats(withSpeed(tr, speed), 'walk');
      expect(s.distanceM).toBe(0);
      expect(s.movingTimeSec).toBe(0);
    }
  });

  it('keeps a walk\'s distance at poor accuracy, with or without GPS speeds', () => {
    const tr = new Track();
    tr.add(10);
    for (let i = 0; i < 360; i++) {
      tr.t += 2;
      tr.east(2.8);
      tr.add(10);
    }
    expect(Math.abs(stats(tr, 'walk').distanceM - 1008)).toBeLessThan(12);
    expect(Math.abs(stats(withSpeed(tr, 1.4), 'walk').distanceM - 1008)).toBeLessThan(12);
  });

  it('max speed comes from GPS speeds: true peak, one spike ignored, capped at the limit', () => {
    const tr = withSpeed(new Track().move(8, 2, 60), 8);
    let n = tr.pts.length;
    withSpeed(tr.move(15, 2, 3), 15, n);
    n = tr.pts.length;
    withSpeed(tr.move(8, 2, 60), 8, n);
    expect(stats(tr, 'cycle').maxSpeedMps).toBeCloseTo(15, 2);
    tr.pts[30] = setSpeed(tr.pts[30], 30);
    expect(stats(tr, 'cycle').maxSpeedMps).toBeCloseTo(15, 2);

    const fast = withSpeed(new Track().move(16, 2, 100), 18);
    expect(stats(fast, 'cycle').maxSpeedMps).toBeCloseTo(60 / 3.6, 2);
  });

  it('keeps the position window when GPS speeds are missing (Android reports 0)', () => {
    const s = stats(withSpeed(new Track().move(3, 2, 150).move(4.5, 2, 30).move(3, 2, 150), 0), 'run');
    expect(s.maxSpeedMps).toBeCloseTo(4.5, 1);
  });

  it('counts the first move after a stop (no fixes while still)', () => {
    const build = (speed: number) => {
      const tr = new Track();
      tr.add();
      for (let stop = 0; stop < 10; stop++) {
        tr.move(5, 2, 50);
        tr.t += 60;
      }
      return withSpeed(tr.move(5, 2, 50), speed);
    };
    const s = stats(build(5), 'cycle');
    expect(Math.abs(s.distanceM - 5500)).toBeLessThan(1);
    expect(s.movingTimeSec).toBe(1100);
    expect(s.vehicleDetected).toBe(false);
    expect(Math.abs(stats(build(-1), 'cycle').distanceM - 5400)).toBeLessThan(1); // can't time it: dropped
  });

  it('noisy walk: distance comes from GPS speeds, not the zig-zag', () => {
    const metresPerDeg = (6371000 * Math.PI) / 180;
    const tr = new Track();
    tr.add();
    for (let i = 0; i < 360; i++) {
      tr.t += 2;
      tr.east(2.8);
      tr.lat += (i % 2 === 0 ? 6 : -6) / metresPerDeg; // ±3 m across the path
      tr.add();
    }
    expect(Math.abs(stats(withSpeed(tr, 1.4), 'walk').distanceM - 1008)).toBeLessThan(5);
  });

  it('drift beyond the accuracy is still when the GPS speed says still', () => {
    const tr = withSpeed(new Track().move(1.4, 2, 100), 1.4);
    for (let i = 0; i < 150; i++) {
      tr.t += 2;
      tr.east(i % 2 === 0 ? 20 : -20);
      tr.add(10);
      tr.pts[tr.pts.length - 1] = setSpeed(tr.pts[tr.pts.length - 1], 0.1);
    }
    const s = stats(tr, 'walk');
    expect(Math.abs(s.distanceM - 280)).toBeLessThan(3);
    expect(Math.abs(s.movingTimeSec - 200)).toBeLessThanOrEqual(2);
  });

  it('a GPS speed spike adds nothing', () => {
    const tr = withSpeed(new Track().move(3, 2, 300), 3);
    tr.pts[150] = setSpeed(tr.pts[150], 40);
    const s = stats(tr, 'run');
    expect(Math.abs(s.distanceM - 1800)).toBeLessThan(0.5);
    expect(s.maxSpeedMps).toBeCloseTo(3, 2);
  });

  it('one stray GPS speed reading does not let drift count', () => {
    const tr = new Track();
    for (let i = 0; i < 150; i++) {
      tr.t += 2;
      tr.east(i % 2 === 0 ? 6 : -6);
      tr.add(10);
      if (i % 5 === 0) tr.pts[tr.pts.length - 1] = setSpeed(tr.pts[tr.pts.length - 1], 1);
    }
    expect(stats(tr, 'walk').distanceM).toBe(0);
  });
});

describe('polyline + formatting', () => {
  it('decodes the Google reference polyline (same vector as the Go encoder test)', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('formats distance, duration and speed', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(5004)).toBe('5.00 km');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatSpeed(1000 / 333)).toBe('10.8 km/h');
  });
});

describe('formatDurationHuman', () => {
  it('reads like words, not a clock', () => {
    expect(formatDurationHuman(5638)).toBe('1h 33m');
    expect(formatDurationHuman(3600)).toBe('1h');
    expect(formatDurationHuman(1686)).toBe('28m 6s');
    expect(formatDurationHuman(120)).toBe('2m');
    expect(formatDurationHuman(45)).toBe('45s');
  });
});

describe('steps + phone vehicle windows (mirrors metrics_test.go)', () => {
  const set = (tr: Track, i: number, speed: number, steps: number) => {
    const [lat, lng, t, acc, seg] = tr.pts[i];
    tr.pts[i] = [lat, lng, t, acc, seg, speed, steps];
  };

  it('a walk whose pedometer stops (on a bus) stops counting after STEP_STILL_SEC', () => {
    const tr = new Track().move(1.4, 2, 50);
    const n = tr.pts.length;
    tr.move(4, 2, 150);
    tr.pts.forEach((_, i) => set(tr, i, i < n ? 1.4 : 4, Math.min(i, n - 1) * 3));
    const s = stats(tr, 'walk');
    expect(Math.abs(s.distanceM - (140 + 4 * 15))).toBeLessThan(10);
    expect(s.steps).toBe((n - 1) * 3);
    expect(Math.abs(stats(tr, 'cycle').distanceM - 1340)).toBeLessThan(15); // rides ignore steps
  });

  it('steps exclude pauses; no pedometer data means no step rule', () => {
    const tr = new Track().move(1.4, 2, 50);
    tr.seg++;
    tr.t += 120;
    tr.move(1.4, 2, 50);
    tr.pts.forEach((_, i) => set(tr, i, -1, i <= 50 ? i * 3 : 300 + (i - 51) * 3));
    expect(stats(tr, 'walk').steps).toBe(150 + 147);
    const plain = stats(new Track().move(3, 2, 100), 'run');
    expect(plain.steps).toBeNull();
    expect(Math.abs(plain.distanceM - 600)).toBeLessThan(1);
  });

  it('a phone-reported vehicle window turns a "ride" at motorbike speed into vehicle travel', () => {
    const tr = new Track().move(8, 2, 100).move(14, 2, 100);
    const s = computeStats(tr.pts, 'cycle', [[200, 400]]);
    expect(Math.abs(s.distanceM - 1600)).toBeLessThan(5);
    expect(Math.abs(s.vehicleDistanceM - 2800)).toBeLessThan(5);
    expect(s.vehicleRanges).toHaveLength(1);
    const walk = computeStats(new Track().move(1.4, 2, 100).pts, 'walk', [[0, 200]]);
    expect(Math.abs(walk.distanceM - 280)).toBeLessThan(1); // slow movement still counts
  });
});
