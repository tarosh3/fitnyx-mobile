import {
  computeStats,
  decodePolyline,
  formatDistance,
  formatDuration,
  formatPace,
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

describe('polyline + formatting', () => {
  it('decodes the Google reference polyline (same vector as the Go encoder test)', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('formats distance, duration and pace', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(5004)).toBe('5.00 km');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatPace(333)).toBe('5:33 /km');
    expect(formatPace(null)).toBe('--:--');
  });
});
