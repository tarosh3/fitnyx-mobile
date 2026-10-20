import type { ExerciseLog } from '@/src/lib/api/workoutSessions';
import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import { fmtWeight } from '@/src/lib/decimal';
import type { Exercise, TrackingType } from '@/src/types/exercise';

/** Body-part groups used for colour and filters (theme `parts` keys). */
export type Part = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';

export const PARTS: { key: Part; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'legs', label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'core', label: 'Core' },
  { key: 'cardio', label: 'Cardio' },
];

/** Maps an anatomical muscle name to a group (mirrors backend classifyMuscleGroup). */
export function partOfMuscle(name: string): Part | null {
  const n = name.toLowerCase();
  if (n.includes('cardio') || n.includes('heart')) return 'cardio';
  if (n.includes('pec') || n.includes('chest')) return 'chest';
  if (/(lat|trap|rhomboid|erector|teres|spinae|back)/.test(n)) return 'back';
  if (/(delt|shoulder|rotator)/.test(n)) return 'shoulders';
  if (/(bicep|tricep|brachi|forearm|wrist|arm)/.test(n)) return 'arms';
  if (/(quad|hamstring|glute|calf|calv|gastro|adductor|abductor|hip|leg|thigh)/.test(n)) return 'legs';
  if (/(ab|oblique|core|transvers)/.test(n)) return 'core';
  return null;
}

export function trackingOf(ex?: Pick<Exercise, 'tracking_type'> | null): TrackingType {
  return ex?.tracking_type ?? 'weight_reps';
}

export function partOf(ex?: Pick<Exercise, 'primary_muscles' | 'tracking_type'> | null): Part {
  if (trackingOf(ex) === 'cardio') return 'cardio';
  for (const m of ex?.primary_muscles ?? []) {
    const p = partOfMuscle(m.name);
    if (p) return p;
  }
  return 'core';
}

export const partLabel = (p: Part) => PARTS.find((x) => x.key === p)?.label ?? 'Other';

// ---------- formatting ----------

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** A weight as entered, up to 2 decimals (1.25 kg plates): 61.25 → "61.25", 60 → "60". */
export function fmtKg(kg: number): string {
  return fmtWeight(kg);
}

export function fmtKm(metres: number): string {
  return (Math.round(metres / 100) / 10).toString();
}

export function fmtVolume(kg: number): string {
  return Math.round(kg).toLocaleString('en-US');
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 × 10 · 60 kg", "2 × 0:45", "20 min · 3 km" — a routine row's targets. */
export function describeTarget(t: TrackingType, it: Pick<WorkoutDayExercise, 'target_sets' | 'target_reps' | 'target_weight_kg' | 'target_duration_sec' | 'target_distance_m'>): string {
  const sets = it.target_sets ?? 1;
  if (t === 'cardio') {
    const min = Math.round((it.target_duration_sec ?? 0) / 60);
    const parts = [min ? `${min} min` : null, it.target_distance_m ? `${fmtKm(it.target_distance_m)} km` : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Your pace';
  }
  if (t === 'duration') return `${sets} × ${fmtClock(it.target_duration_sec ?? 45)}`;
  const reps = it.target_reps ?? 10;
  if (t === 'reps') return `${sets} × ${reps}${it.target_weight_kg ? ` · +${fmtKg(it.target_weight_kg)} kg` : ''}`;
  return `${sets} × ${reps}${it.target_weight_kg ? ` · ${fmtKg(it.target_weight_kg)} kg` : ''}`;
}

/** One logged set in words: "60 kg × 10", "20 reps", "0:45", "20 min · 3.1 km". */
export function describeSet(t: TrackingType, s: Pick<ExerciseLog, 'reps' | 'weight_kg' | 'duration_sec' | 'distance_m'>): string {
  if (t === 'cardio') {
    const min = Math.round((s.duration_sec ?? 0) / 60);
    return [`${min} min`, s.distance_m ? `${fmtKm(s.distance_m)} km` : null].filter(Boolean).join(' · ');
  }
  if (t === 'duration') return `${fmtClock(s.duration_sec ?? 0)} hold`;
  if (t === 'reps') return `${s.reps} reps${s.weight_kg ? ` · +${fmtKg(s.weight_kg)} kg` : ''}`;
  return `${fmtKg(s.weight_kg ?? 0)} kg × ${s.reps}`;
}

// ---------- sets ----------

/** Values in an editable set row before it is logged. */
export interface DraftSet {
  reps: number;
  weightKg: number; // 0 = bodyweight / no load
  durationSec: number;
  distanceM: number;
}

/**
 * Pre-fill for the next set, highest priority first:
 * the previous set this workout → the routine target → last time → a sensible default.
 * (Set 1 used to pre-fill last time's 19 kg over the routine's 60 kg target.)
 */
export function prefill(
  t: TrackingType,
  target: Partial<Pick<WorkoutDayExercise, 'target_reps' | 'target_weight_kg' | 'target_duration_sec' | 'target_distance_m'>> | null,
  previousThisWorkout: Partial<DraftSet> | null,
  lastTime: Partial<DraftSet> | null,
): DraftSet {
  const pick = <T,>(...v: (T | null | undefined)[]) => v.find((x) => x != null && (typeof x !== 'number' || x > 0)) as T | undefined;
  const base = previousThisWorkout ?? {};
  const last = lastTime ?? {};
  return {
    reps: pick(base.reps, target?.target_reps, last.reps) ?? (t === 'reps' ? 12 : 10),
    weightKg: pick(base.weightKg, target?.target_weight_kg, last.weightKg) ?? (t === 'weight_reps' ? 20 : 0),
    durationSec: pick(base.durationSec, target?.target_duration_sec, last.durationSec) ?? (t === 'cardio' ? 20 * 60 : 45),
    distanceM: pick(base.distanceM, target?.target_distance_m, last.distanceM) ?? 0,
  };
}

/** Converts a draft into the logging API fields for its tracking type. */
export function draftToLog(t: TrackingType, d: DraftSet) {
  if (t === 'cardio') return { actual_reps: 0, actual_duration_sec: d.durationSec, actual_distance_m: d.distanceM || undefined };
  if (t === 'duration') return { actual_reps: 0, actual_duration_sec: d.durationSec };
  return { actual_reps: d.reps, actual_weight_kg: d.weightKg > 0 ? d.weightKg : undefined };
}

export function logToDraft(l: Pick<ExerciseLog, 'reps' | 'weight_kg' | 'duration_sec' | 'distance_m'>): DraftSet {
  return { reps: l.reps, weightKg: l.weight_kg ?? 0, durationSec: l.duration_sec ?? 0, distanceM: l.distance_m ?? 0 };
}

// ---------- workout summary ----------

export interface SessionTotals {
  sets: number;
  volumeKg: number;
  cardioSec: number;
  distanceM: number;
  prs: number;
}

export function totals(
  logs: Pick<ExerciseLog, 'reps' | 'weight_kg' | 'duration_sec' | 'distance_m' | 'is_warmup' | 'is_pr' | 'exercise_uuid'>[],
  typeOf: (uuid: string) => TrackingType,
): SessionTotals {
  const out: SessionTotals = { sets: 0, volumeKg: 0, cardioSec: 0, distanceM: 0, prs: 0 };
  for (const l of logs) {
    out.sets++;
    if (l.is_pr) out.prs++;
    const t = typeOf(l.exercise_uuid);
    if ((t === 'weight_reps' || t === 'reps') && !l.is_warmup) out.volumeKg += (l.weight_kg ?? 0) * l.reps;
    if (t === 'cardio') {
      out.cardioSec += l.duration_sec ?? 0;
      out.distanceM += l.distance_m ?? 0;
    }
  }
  return out;
}

/** XP for a finished workout — same formula as the server's lifetimeXPSQL. */
export function workoutXp(durationSec: number, volumeKg: number): number {
  return 300 + Math.round((durationSec / 60) * 5) + Math.round(volumeKg / 100);
}

/** What changed versus the routine, for the "Update routine?" question at Finish. */
export function routineChanges(plannedUuids: string[], doneUuids: string[]) {
  const planned = new Set(plannedUuids);
  const done = new Set(doneUuids);
  return {
    added: doneUuids.filter((u, i) => !planned.has(u) && doneUuids.indexOf(u) === i),
    skipped: plannedUuids.filter((u) => !done.has(u)),
  };
}

/** "today", "yesterday", "5 days ago" for a YYYY-MM-DD date (local). */
export function agoLabel(dateKey: string | null | undefined, now = new Date()): string {
  if (!dateKey) return 'not done yet';
  const [y, m, d] = dateKey.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
