/**
 * Date ranges and bucketing for the Progress tab. Pure (no React), so it is
 * unit-tested. Dates are local calendar dates as YYYY-MM-DD; arithmetic runs
 * in UTC so daylight-saving changes never shift a day.
 */
import type { ProgressDay } from '@/src/lib/api/progress';

export type Gran = 'day' | 'week' | 'month';
export type PresetKey = '7d' | '30d' | '3m' | '1y';
export interface DateRange { from: string; to: string }
export type RangeChoice = { preset: PresetKey } | { custom: DateRange };

/** The widest range a user can pick (a year, plus a leap day). */
export const MAX_RANGE_DAYS = 366;
/** Day bars stop being readable past ~3 months. */
const MAX_DAY_BUCKETS = 92;

export const PRESETS: { key: PresetKey; label: string; days: number; title: string }[] = [
  { key: '7d', label: '7D', days: 7, title: 'Last 7 days' },
  { key: '30d', label: '30D', days: 30, title: 'Last 30 days' },
  { key: '3m', label: '3M', days: 90, title: 'Last 3 months' },
  { key: '1y', label: '1Y', days: 365, title: 'Last 12 months' },
];

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isoOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const addDays = (iso: string, n: number) => isoOf(toMs(iso) + n * DAY_MS);

export const spanDays = (r: DateRange) => Math.round((toMs(r.to) - toMs(r.from)) / DAY_MS) + 1;

export function resolveRange(choice: RangeChoice, today: string): DateRange {
  if ('custom' in choice) return choice.custom;
  const days = PRESETS.find((p) => p.key === choice.preset)?.days ?? 7;
  return { from: addDays(today, -(days - 1)), to: today };
}

/** The equally long period right before r ("vs the 30 days before"). */
export function previousRange(r: DateRange): DateRange {
  const n = spanDays(r);
  return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
}

export function granOptions(span: number): Record<Gran, boolean> {
  return { day: span <= MAX_DAY_BUCKETS, week: span >= 14, month: span >= 28 };
}

export const autoGran = (span: number): Gran => (span <= 31 ? 'day' : span <= 183 ? 'week' : 'month');

/** The requested grouping when it suits the span, else the nearest one that does. */
export function resolveGran(requested: Gran, span: number): Gran {
  const ok = granOptions(span);
  if (ok[requested]) return requested;
  if (requested === 'day') return ok.week ? 'week' : 'month';
  if (requested === 'month') return ok.week ? 'week' : 'day';
  return ok.day ? 'day' : 'month';
}

/** Why a custom range can't be shown, or null when it can. */
export function validateRange(from: string | null, to: string | null, today: string): string | null {
  if (!from || !to) return 'Pick both dates';
  if (to < from) return 'The end date is before the start date';
  if (to > today) return 'The end date is in the future';
  const n = spanDays({ from, to });
  if (n > MAX_RANGE_DAYS) return `That's ${n} days. Pick 1 year or less`;
  return null;
}

const dayMonth = (iso: string) => {
  const d = new Date(toMs(iso));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export function formatRange(r: DateRange): string {
  const y1 = r.from.slice(0, 4);
  const y2 = r.to.slice(0, 4);
  if (r.from === r.to) return `${dayMonth(r.from)} ${y2}`;
  return y1 === y2 ? `${dayMonth(r.from)} – ${dayMonth(r.to)} ${y2}` : `${dayMonth(r.from)} ${y1} – ${dayMonth(r.to)} ${y2}`;
}

export function rangeTitle(choice: RangeChoice, r: DateRange): string {
  if ('custom' in choice) return formatRange(r);
  return PRESETS.find((p) => p.key === choice.preset)?.title ?? formatRange(r);
}

export interface Totals {
  workouts: number;
  workoutSec: number;
  volumeKg: number;
  sets: number;
  roams: number;
  roamSec: number;
  distanceM: number;
  activeDays: number;
}

export const emptyTotals = (): Totals => ({ workouts: 0, workoutSec: 0, volumeKg: 0, sets: 0, roams: 0, roamSec: 0, distanceM: 0, activeDays: 0 });

function add(t: Totals, d: ProgressDay) {
  t.workouts += d.workouts;
  t.workoutSec += d.workout_sec;
  t.volumeKg += d.volume_kg;
  t.sets += d.sets;
  t.roams += d.roams;
  t.roamSec += d.roam_sec;
  t.distanceM += d.distance_m;
  if (d.workouts > 0 || d.roams > 0) t.activeDays += 1;
}

export function sumDays(days: ProgressDay[], r: DateRange): Totals {
  const t = emptyTotals();
  for (const d of days) if (d.date >= r.from && d.date <= r.to) add(t, d);
  return t;
}

/** Percent change from prev to cur, or null when there is nothing to compare with. */
export function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export interface Bucket extends Totals {
  /** First date the bucket covers (a Monday for weeks, the 1st for months, clipped to the range). */
  start: string;
  end: string;
  label: string;
}

function bucketStart(iso: string, gran: Gran): string {
  if (gran === 'day') return iso;
  const d = new Date(toMs(iso));
  if (gran === 'week') return addDays(iso, -((d.getUTCDay() + 6) % 7));
  return isoOf(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Every bucket in r (empty ones included, so the chart keeps its time axis),
 * with sparse labels: at most ~7 per chart, always including the latest.
 */
export function bucketize(days: ProgressDay[], r: DateRange, gran: Gran, today: string): Bucket[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const buckets: Bucket[] = [];
  for (let iso = r.from; iso <= r.to; iso = addDays(iso, 1)) {
    const start = bucketStart(iso, gran);
    let b = buckets[buckets.length - 1];
    if (!b || b.start !== (start < r.from ? r.from : start)) {
      b = { ...emptyTotals(), start: start < r.from ? r.from : start, end: iso, label: '' };
      buckets.push(b);
    }
    b.end = iso;
    const d = byDate.get(iso);
    if (d) add(b, d);
  }
  const n = buckets.length;
  const every = Math.ceil(n / 7);
  buckets.forEach((b, i) => {
    const d = new Date(toMs(b.start));
    if (gran === 'day' && n <= 7) b.label = b.start === today ? 'Today' : WEEKDAYS[d.getUTCDay()];
    else if (gran === 'month' && n <= 12) b.label = n > 6 ? MONTHS[d.getUTCMonth()].charAt(0) : MONTHS[d.getUTCMonth()];
    else if ((n - 1 - i) % every === 0) b.label = gran === 'day' ? String(d.getUTCDate()) : gran === 'week' ? dayMonth(b.start) : MONTHS[d.getUTCMonth()];
  });
  return buckets;
}

/** Days of the month containing `today`, Monday-first, padded with nulls. */
export function monthGrid(today: string): (string | null)[] {
  const d = new Date(toMs(today));
  const first = isoOf(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const lead = (new Date(toMs(first)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const monthName = (iso: string) => {
  const d = new Date(toMs(iso));
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()];
};

export function formatDuration(sec: number): { h: number; m: number } {
  const mins = Math.round(sec / 60);
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

export const shortDate = (iso: string) => dayMonth(iso);
