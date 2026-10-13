import { fmtClock, fmtKg, fmtKm } from '@/src/features/workouts/model';
import type { ExerciseHistory, ExerciseHistorySet } from '@/src/lib/api/exercises';
import type { TrackingType } from '@/src/types/exercise';

/** "Stand tall. Brace. Lower slowly." → numbered steps. */
export function howToSteps(text: string | undefined | null): string[] {
  if (!text?.trim()) return [];
  const lines = text.split(/\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return text.replace(/([.!?])\s*(?=[A-Z])/g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean);
}

export const asLog = (s: ExerciseHistorySet) => ({ reps: s.reps, weight_kg: s.weight_kg ?? undefined, duration_sec: s.duration_sec ?? undefined, distance_m: s.distance_m ?? undefined });

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Headline numbers for the exercise's type: Best kg, most reps, longest hold, longest run. */
export function progressStats(t: TrackingType, h: ExerciseHistory): { label: string; value: string }[] {
  const sets = h.days.flatMap((d) => d.sets);
  const max = (f: (s: ExerciseHistorySet) => number) => sets.reduce((m, s) => Math.max(m, f(s)), 0);
  const sessions = { label: 'Workouts', value: String(h.summary.total_sessions || h.days.length) };
  if (t === 'cardio') return [{ label: 'Longest', value: `${Math.round(max((s) => s.duration_sec ?? 0) / 60)} min` }, { label: 'Farthest', value: `${fmtKm(max((s) => s.distance_m ?? 0))} km` }, sessions];
  if (t === 'duration') return [{ label: 'Longest hold', value: fmtClock(max((s) => s.duration_sec ?? 0)) }, sessions];
  if (t === 'reps') return [{ label: 'Most reps', value: String(max((s) => s.reps)) }, sessions];
  return [
    { label: 'Best', value: h.summary.best_weight_kg != null ? `${fmtKg(h.summary.best_weight_kg)} kg` : '—' },
    { label: 'Est. max', value: h.summary.best_est_1rm_kg != null ? `${fmtKg(h.summary.best_est_1rm_kg)} kg` : '—' },
    sessions,
  ];
}
