import type { ReportData, ReportSet } from '@/src/lib/api/reports';
import { localDateKey } from '@/src/lib/api/workoutSessions';

export type RangeKind = 'week' | 'month' | 'year';

export interface ReportRange {
  kind: RangeKind;
  from: string;
  to: string;
  /** "13 – 19 Oct 2026", "October 2026", "2026". */
  label: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const short = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

/** The week (Mon–Sun), month or year `offset` periods back from `now` (0 = current). */
export function reportRange(kind: RangeKind, offset: number, now: Date = new Date()): ReportRange {
  if (kind === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 7 * offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { kind, from: localDateKey(start), to: localDateKey(end), label: `${short(start)} – ${short(end)} ${end.getFullYear()}` };
  }
  if (kind === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { kind, from: localDateKey(start), to: localDateKey(end), label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}` };
  }
  const year = now.getFullYear() - offset;
  return { kind, from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) };
}

/** Epley estimate for 1–12 reps (same rule as the backend's report summary). */
export function est1RM(weightKg: number | null, reps: number): number {
  if (!weightKg || weightKg <= 0 || reps < 1 || reps > 12) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export interface ExerciseLine {
  uuid: string;
  title: string;
  trackingType: string;
  sets: number;
  bestWeightKg: number | null;
  bestReps: number;
  best1RM: number;
  /** Est. 1RM on the first and last day it was done in the range (progress within the range). */
  first1RM: number;
  last1RM: number;
  longestSec: number;
  distanceM: number;
  prs: number;
  /** Assisted exercises: the least help taken (less is better) and its reps. */
  bestAssistKg: number | null;
  bestAssistReps: number;
  /** Local dates: first and last time in the range, and the day of the best set shown. */
  firstDate: string;
  lastDate: string;
  bestDate: string;
  /** Distinct days it was done. */
  days: number;
}

export interface ReportTotals {
  workouts: number;
  trainingDays: number;
  durationSec: number;
  sets: number;
  /** Sets that aren't warm-ups. */
  workingSets: number;
  volumeKg: number;
  prs: number;
  roams: number;
  roamKm: number;
  /** Working sets per primary muscle, most first. */
  muscles: { name: string; sets: number }[];
  exercises: ExerciseLine[];
}

const working = (s: ReportSet) => !s.is_warmup;

export function reportTotals(d: ReportData): ReportTotals {
  const days = new Set<string>();
  const muscles = new Map<string, number>();
  type Work = ExerciseLine & { dates: Set<string>; weightDate: string; repsDate: string; assistDate: string; longestDate: string; rmDate: string };
  const ex = new Map<string, Work>();
  let durationSec = 0, sets = 0, workingSets = 0, volumeKg = 0, prs = 0;
  for (const s of d.sessions) {
    days.add(s.date);
    durationSec += s.duration_sec;
    for (const st of s.sets) {
      sets++;
      if (working(st)) workingSets++;
      if (st.is_pr) prs++;
      if (working(st) && st.weight_kg) volumeKg += st.weight_kg * st.reps;
      const info = d.exercises[st.exercise_uuid];
      if (working(st)) for (const m of info?.primary_muscles ?? []) muscles.set(m, (muscles.get(m) ?? 0) + 1);
      let line = ex.get(st.exercise_uuid);
      if (!line) {
        line = {
          uuid: st.exercise_uuid, title: info?.title ?? 'Exercise', trackingType: info?.tracking_type ?? 'weight_reps',
          sets: 0, bestWeightKg: null, bestReps: 0, best1RM: 0, first1RM: 0, last1RM: 0, longestSec: 0, distanceM: 0, prs: 0,
          bestAssistKg: null, bestAssistReps: 0, firstDate: s.date, lastDate: s.date, bestDate: s.date, days: 0,
          dates: new Set(), weightDate: '', repsDate: '', assistDate: '', longestDate: '', rmDate: '',
        };
        ex.set(st.exercise_uuid, line);
      }
      line.sets++;
      line.dates.add(s.date);
      if (s.date < line.firstDate) line.firstDate = s.date;
      if (s.date > line.lastDate) line.lastDate = s.date;
      if (st.is_pr) line.prs++;
      if (working(st) && st.assist_kg !== null && st.assist_kg !== undefined) {
        const a = st.assist_kg;
        if (line.bestAssistKg === null || a < line.bestAssistKg || (a === line.bestAssistKg && st.reps > line.bestAssistReps)) {
          line.bestAssistKg = a;
          line.bestAssistReps = st.reps;
          line.assistDate = s.date;
        }
      }
      if (working(st) && st.weight_kg) {
        if (line.bestWeightKg === null || st.weight_kg > line.bestWeightKg || (st.weight_kg === line.bestWeightKg && st.reps > line.bestReps)) {
          line.bestWeightKg = st.weight_kg;
          line.bestReps = st.reps;
          line.weightDate = s.date;
        }
        const e = est1RM(st.weight_kg, st.reps);
        line.best1RM = Math.max(line.best1RM, e);
        if (s.date === line.firstDate) line.first1RM = Math.max(line.first1RM, e);
        if (s.date > line.rmDate) { line.rmDate = s.date; line.last1RM = 0; }
        if (s.date === line.rmDate) line.last1RM = Math.max(line.last1RM, e);
      } else if (!st.weight_kg && st.reps > line.bestReps) {
        line.bestReps = st.reps;
        line.repsDate = s.date;
      }
      if ((st.duration_sec ?? 0) > line.longestSec) {
        line.longestSec = st.duration_sec ?? 0;
        line.longestDate = s.date;
      }
      line.distanceM += st.distance_m ?? 0;
    }
  }
  for (const r of d.roams) days.add(r.date);
  return {
    workouts: d.sessions.length,
    trainingDays: days.size,
    durationSec,
    sets,
    workingSets,
    volumeKg,
    prs,
    roams: d.roams.length,
    roamKm: d.roams.reduce((n, r) => n + r.distance_m, 0) / 1000,
    muscles: [...muscles].map(([name, n]) => ({ name, sets: n })).sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name)),
    exercises: [...ex.values()]
      .sort((a, b) => b.sets - a.sets || a.title.localeCompare(b.title))
      .map(({ dates, weightDate, repsDate, assistDate, longestDate, rmDate: _rm, ...line }) => ({
        ...line,
        days: dates.size,
        // The same order the PDF picks the best set to show in.
        bestDate: (line.bestWeightKg ? weightDate : line.bestAssistKg !== null ? assistDate : line.longestSec ? longestDate : repsDate) || line.lastDate,
      })),
  };
}
