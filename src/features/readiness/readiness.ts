import type { ReadinessDay } from '@/src/lib/health/types';

/**
 * Daily readiness score (Whoop / Oura / Athlytic style), computed on the device
 * from wearable data in the health store. Everything here is pure and testable:
 * feed it a day series (oldest → newest) and it returns a 0–100 score.
 *
 * The score blends three drivers against the user's OWN rolling baseline, so the
 * absolute HRV metric (SDNN on iOS, RMSSD on Android) never needs to match:
 *   - HRV vs baseline  (higher = better)   weight 50%
 *   - resting HR vs baseline (lower = better) weight 25%
 *   - last night's sleep vs need            weight 25%
 * A driver with no data drops out and its weight is redistributed.
 */

export type ReadinessBand = 'recover' | 'moderate' | 'primed' | 'insufficient';

export interface ReadinessDriver {
  /** Today's value (HRV ms / resting bpm / sleep hours), or null if missing. */
  value: number | null;
  /** The baseline this is compared against (rolling mean, or sleep need), or null. */
  baseline: number | null;
  /** 0–1 sub-score, or null when this driver couldn't be scored. */
  score: number | null;
  status: 'good' | 'fair' | 'low' | 'none';
}

export interface Readiness {
  /** 0–100, or null when there isn't enough baseline / data yet. */
  score: number | null;
  band: ReadinessBand;
  /** One-line, user-facing. */
  reason: string;
  drivers: { hrv: ReadinessDriver; rhr: ReadinessDriver; sleep: ReadinessDriver };
  /** Days of HRV baseline available — how "warmed up" the score is. */
  baselineDays: number;
}

const MIN_BASELINE_DAYS = 7; // need at least this many prior HRV days to score
const BASELINE_WINDOW = 28; // rolling baseline length
const SLEEP_NEED_H = 8;
const WEIGHTS = { hrv: 0.5, rhr: 0.25, sleep: 0.25 };

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** z-score → 0..1: 0 at baseline, saturating near ±2.5 SD. */
function zToScore(z: number): number {
  return clamp01(0.5 + z / 5);
}

function statusOf(score: number): ReadinessDriver['status'] {
  return score >= 0.6 ? 'good' : score >= 0.4 ? 'fair' : 'low';
}

function none(value: number | null, baseline: number | null): ReadinessDriver {
  return { value, baseline, score: null, status: 'none' };
}

function reasonFor(band: ReadinessBand, d: Readiness['drivers']): string {
  if (band === 'primed') {
    return d.hrv.status === 'good'
      ? 'HRV above your baseline — good day to push'
      : 'Recovered and ready — good day to push';
  }
  if (band === 'recover') {
    if (d.sleep.status === 'low' && d.hrv.status === 'low') return 'Low HRV and short sleep — take it easy today';
    if (d.hrv.status === 'low') return 'HRV below your baseline — ease off today';
    if (d.sleep.status === 'low') return 'Short sleep — keep it light today';
    return 'Recovery is low — take it easy today';
  }
  // moderate
  if (d.sleep.status === 'low') return 'A bit under-slept — moderate effort today';
  if (d.hrv.status === 'low') return 'HRV slightly low — moderate effort today';
  return 'Steady recovery — train as planned';
}

export function computeReadiness(series: ReadinessDay[]): Readiness {
  const today = series.length ? series[series.length - 1] : null;
  const window = series.slice(0, -1).slice(-BASELINE_WINDOW);
  const hrvBase = window.map((d) => d.hrvMs).filter((v): v is number => v != null);
  const rhrBase = window.map((d) => d.restingHr).filter((v): v is number => v != null);

  // Not enough HRV history → can't score yet.
  if (!today || hrvBase.length < MIN_BASELINE_DAYS) {
    return {
      score: null,
      band: 'insufficient',
      reason: hrvBase.length
        ? `Building your baseline (${hrvBase.length}/${MIN_BASELINE_DAYS} days)`
        : 'Connect a watch or ring to measure readiness',
      drivers: {
        hrv: none(today?.hrvMs ?? null, hrvBase.length ? Math.round(mean(hrvBase)) : null),
        rhr: none(today?.restingHr ?? null, rhrBase.length ? Math.round(mean(rhrBase)) : null),
        sleep: none(today?.sleepHours ?? null, SLEEP_NEED_H),
      },
      baselineDays: hrvBase.length,
    };
  }

  // HRV driver — higher is better.
  const hrvMean = mean(hrvBase);
  const hrvSd = Math.max(stdev(hrvBase, hrvMean), hrvMean * 0.05, 1);
  const hrv: ReadinessDriver = today.hrvMs != null
    ? (() => {
        const s = zToScore((today.hrvMs! - hrvMean) / hrvSd);
        return { value: today.hrvMs!, baseline: Math.round(hrvMean), score: s, status: statusOf(s) };
      })()
    : none(null, Math.round(hrvMean));

  // Resting HR driver — lower is better; needs its own baseline.
  let rhr: ReadinessDriver;
  if (today.restingHr != null && rhrBase.length >= MIN_BASELINE_DAYS) {
    const rhrMean = mean(rhrBase);
    const rhrSd = Math.max(stdev(rhrBase, rhrMean), rhrMean * 0.03, 1);
    const s = zToScore((rhrMean - today.restingHr) / rhrSd);
    rhr = { value: today.restingHr, baseline: Math.round(rhrMean), score: s, status: statusOf(s) };
  } else {
    rhr = none(today.restingHr ?? null, rhrBase.length ? Math.round(mean(rhrBase)) : null);
  }

  // Sleep driver — vs need. ~4h floors out, ~8.5h tops out.
  let sleep: ReadinessDriver;
  if (today.sleepHours != null) {
    const s = clamp01((today.sleepHours - 4) / (SLEEP_NEED_H - 3.5));
    sleep = { value: today.sleepHours, baseline: SLEEP_NEED_H, score: s, status: statusOf(s) };
  } else {
    sleep = none(null, SLEEP_NEED_H);
  }

  // Weighted blend over whichever drivers scored; redistribute missing weight.
  const parts: Array<[number, number]> = [];
  if (hrv.score != null) parts.push([WEIGHTS.hrv, hrv.score]);
  if (rhr.score != null) parts.push([WEIGHTS.rhr, rhr.score]);
  if (sleep.score != null) parts.push([WEIGHTS.sleep, sleep.score]);
  const wsum = parts.reduce((a, [w]) => a + w, 0);

  const drivers = { hrv, rhr, sleep };
  if (!wsum) {
    return {
      score: null,
      band: 'insufficient',
      reason: 'No overnight data last night — wear your watch to bed',
      drivers,
      baselineDays: hrvBase.length,
    };
  }

  const score = Math.round((parts.reduce((a, [w, s]) => a + w * s, 0) / wsum) * 100);
  const band: ReadinessBand = score < 34 ? 'recover' : score <= 66 ? 'moderate' : 'primed';
  return { score, band, reason: reasonFor(band, drivers), drivers, baselineDays: hrvBase.length };
}
