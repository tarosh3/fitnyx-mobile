import type { ReportData, ReportRoam, ReportSession, ReportSet } from '@/src/lib/api/reports';
import { fromKey, monthName, timeOf, weekLabel, weekStart } from '@/src/features/workouts/report/dates';
import { defaultActivityName } from '@/src/features/roam/activityName';

// Workouts and Roams in the order they happened, and totals per week / month.

export type TimelineItem =
  | { kind: 'workout'; date: string; at: string; session: ReportSession }
  | { kind: 'roam'; date: string; at: string | undefined; roam: ReportRoam };

export interface Period {
  /** First day (a Monday for weeks, the 1st for months). */
  key: string;
  label: string;
  items: TimelineItem[];
  workouts: number;
  workingSets: number;
  volumeKg: number;
  durationSec: number;
  roams: number;
  roamKm: number;
}

export const workingSets = (sets: ReportSet[]) => sets.filter((s) => !s.is_warmup);
export const sessionVolume = (sets: ReportSet[]) => workingSets(sets).reduce((n, s) => n + (s.weight_kg ?? 0) * s.reps, 0);

/** Every workout and Roam, by local date, then by start time (unknown times keep the server's order). */
export function timeline(d: ReportData): TimelineItem[] {
  const items: TimelineItem[] = [
    ...d.sessions.map((s): TimelineItem => ({ kind: 'workout', date: s.date, at: s.started_at, session: s })),
    ...d.roams.map((r): TimelineItem => ({ kind: 'roam', date: r.date, at: r.started_at, roam: r })),
  ];
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => a.it.date.localeCompare(b.it.date) || (timeOf(a.it.at) || 0) - (timeOf(b.it.at) || 0) || a.i - b.i)
    .map(({ it }) => it);
}

function group(items: TimelineItem[], keyOf: (date: string) => string, labelOf: (key: string) => string): Period[] {
  const out = new Map<string, Period>();
  for (const it of items) {
    const key = keyOf(it.date);
    let p = out.get(key);
    if (!p) {
      p = { key, label: labelOf(key), items: [], workouts: 0, workingSets: 0, volumeKg: 0, durationSec: 0, roams: 0, roamKm: 0 };
      out.set(key, p);
    }
    p.items.push(it);
    if (it.kind === 'workout') {
      p.workouts++;
      p.workingSets += workingSets(it.session.sets).length;
      p.volumeKg += sessionVolume(it.session.sets);
      p.durationSec += it.session.duration_sec;
    } else {
      p.roams++;
      p.roamKm += it.roam.distance_m / 1000;
    }
  }
  return [...out.values()];
}

/** Monday-to-Sunday weeks that have something in them. */
export const byWeek = (items: TimelineItem[]) => group(items, weekStart, weekLabel);

/** Calendar months that have something in them. */
export const byMonth = (items: TimelineItem[]) =>
  group(items, (date) => `${date.slice(0, 7)}-01`, (key) => `${monthName(fromKey(key).getMonth())} ${key.slice(0, 4)}`);

const ROAM_KIND: Record<ReportRoam['type'], string> = { run: 'Run', walk: 'Walk', cycle: 'Ride' };

/** 'Run' / 'Walk' / 'Ride': the stored type, which a reader needs (the app shows run and walk as Stride). */
export const roamKind = (r: ReportRoam) => ROAM_KIND[r.type] ?? 'Roam';

/** The Roam's name, else the app's default ("Morning Stride"); just the type when the start time is unknown. */
export function roamTitle(r: ReportRoam): string {
  return r.name?.trim() || (r.started_at ? defaultActivityName(r.type, r.started_at) : roamKind(r));
}
