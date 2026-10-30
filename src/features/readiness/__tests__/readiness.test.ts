import type { ReadinessDay } from '@/src/lib/health/types';
import { computeReadiness } from '../readiness';

const day = (hrvMs: number | null, restingHr: number | null, sleepHours: number | null): ReadinessDay => ({
  date: 'd',
  hrvMs,
  restingHr,
  sleepHours,
});

/** n prior days at a steady baseline, then today appended last. */
const withToday = (n: number, base: ReadinessDay, today: ReadinessDay): ReadinessDay[] => [
  ...Array.from({ length: n }, () => ({ ...base })),
  today,
];

describe('computeReadiness', () => {
  it('needs a watch when there is no HRV history at all', () => {
    const r = computeReadiness([]);
    expect(r.score).toBeNull();
    expect(r.band).toBe('insufficient');
    expect(r.reason).toMatch(/Connect a watch/);
    expect(r.baselineDays).toBe(0);
  });

  it('reports baseline warm-up until there are enough days', () => {
    const r = computeReadiness(withToday(5, day(50, 55, 8), day(55, 54, 8)));
    expect(r.score).toBeNull();
    expect(r.band).toBe('insufficient');
    expect(r.reason).toBe('Building your baseline (5/7 days)');
    expect(r.baselineDays).toBe(5);
  });

  it('scores primed when HRV is up, resting HR down and sleep full', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(70, 48, 8.5)));
    expect(r.band).toBe('primed');
    expect(r.score).toBeGreaterThan(66);
    expect(r.drivers.hrv.status).toBe('good');
    expect(r.reason).toMatch(/good day to push/);
  });

  it('scores recover when HRV is low and sleep is short', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(30, 65, 4.5)));
    expect(r.band).toBe('recover');
    expect(r.score).toBeLessThan(34);
    expect(r.reason).toMatch(/take it easy/);
  });

  it('lands in the moderate band when today sits near baseline', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(50, 55, 8)));
    expect(r.band).toBe('moderate');
    expect(r.score).toBeGreaterThanOrEqual(34);
    expect(r.score).toBeLessThanOrEqual(66);
  });

  it('still scores when a driver is missing, redistributing its weight', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(50, 55, null)));
    expect(r.score).toBe(50); // hrv 0.5 + rhr 0.5, sleep dropped
    expect(r.drivers.sleep.score).toBeNull();
    expect(r.drivers.sleep.status).toBe('none');
  });

  it('is insufficient when last night has no data at all', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(null, null, null)));
    expect(r.score).toBeNull();
    expect(r.band).toBe('insufficient');
    expect(r.reason).toMatch(/No overnight data/);
  });

  it('does not divide by zero when the baseline is perfectly flat', () => {
    const r = computeReadiness(withToday(14, day(50, 55, 8), day(55, 53, 8)));
    expect(r.score).not.toBeNull();
    expect(Number.isFinite(r.score as number)).toBe(true);
  });

  it('caps the baseline window and reports days used', () => {
    const r = computeReadiness(withToday(40, day(50, 55, 8), day(60, 50, 8)));
    expect(r.baselineDays).toBe(28); // BASELINE_WINDOW
  });
});
