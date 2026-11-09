import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import type { DayTargets, PhaseKind, ProgramChange, ProgramPhase } from '@/src/lib/api/programs';

// Pure helpers for the adaptive program. The phase rules mirror backend
// internal/program PhaseFor (without the extra set, which needs the experience
// level the phone doesn't hold): change both together.

export function phaseKindFor(week: number, weeks: number): PhaseKind {
  if (week >= weeks) return 'test';
  if (week % 4 === 0) return 'deload';
  return 'build';
}

export function phaseLabel(ph: ProgramPhase): string {
  if (ph.kind === 'deload') return 'Lighter week';
  if (ph.kind === 'test') return 'Test week';
  return ph.extra_set ? 'Building · extra set' : 'Building';
}

export function phaseDetail(ph: ProgramPhase): string {
  if (ph.kind === 'deload') return 'One set fewer and about 10% lighter, so your body catches up and comes back stronger.';
  if (ph.kind === 'test') return 'The last week: fewer sets. Give the last set of each lift everything, with good form.';
  if (ph.extra_set) return 'The hardest week of this stretch: one extra set on each lift. Next week is lighter.';
  return 'Every target comes from what you did last time. Hit them all and the weight goes up.';
}

export interface StripWeek {
  week: number;
  kind: PhaseKind;
  state: 'done' | 'now' | 'next';
}

/** The whole block, week by week, for the strip at the top. */
export function weekStrip(weeks: number, week: number, finished: boolean): StripWeek[] {
  return Array.from({ length: weeks }, (_, i) => {
    const w = i + 1;
    const state = finished || w < week ? 'done' : w === week ? 'now' : 'next';
    return { week: w, kind: phaseKindFor(w, weeks), state };
  });
}

/**
 * A program day's rows with today's targets in place. Rows the server didn't send
 * keep what they had. On an assisted exercise target_weight_kg is the assistance.
 */
export function applyTargets(planned: WorkoutDayExercise[], t: DayTargets | null): WorkoutDayExercise[] {
  if (!t?.items.length) return planned;
  const byRow = new Map(t.items.map((it) => [it.day_exercise_id, it]));
  return planned.map((p) => {
    const it = byRow.get(p.id);
    if (!it || it.exercise_uuid !== p.exercise_uuid) return p; // swapped since: leave it
    const assisted = p.exercise?.tracking_type === 'assisted_reps';
    return {
      ...p,
      target_sets: it.sets,
      target_reps: it.reps ?? p.target_reps,
      target_weight_kg: assisted ? it.assist_kg ?? p.target_weight_kg : it.weight_kg,
      target_duration_sec: it.duration_sec ?? p.target_duration_sec,
      target_distance_m: it.distance_m ?? p.target_distance_m,
      rest_seconds: it.rest_sec ?? p.rest_seconds,
      program_light: t.phase.kind === 'deload',
    };
  });
}

const n1 = (v: number) => (Math.round(v * 10) / 10).toString();

/**
 * "+22%": how much stronger. A percentage, not the estimated max in kg, which read
 * as a weight never lifted ("Lateral Raise 30 → 36.7 kg" for sets of 27.5 kg).
 * null when it can't be shown (assisted: its score isn't a quantity).
 */
export function formatChange(c: ProgramChange): string | null {
  if (!c.unit || !(c.from > 0) || !(c.to > c.from)) return null;
  return `+${Math.max(1, Math.round((c.to / c.from - 1) * 100))}%`;
}

/** "62.5 kg × 8", "3 × 12", "45 s": one target line for the preview. */
export function targetLine(t: { sets: number; reps?: number; weight_kg?: number; assist_kg?: number; duration_sec?: number; distance_m?: number }): string {
  if (t.duration_sec && !t.reps) {
    const m = Math.floor(t.duration_sec / 60);
    const s = t.duration_sec % 60;
    const time = m ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`;
    return t.sets > 1 ? `${t.sets} × ${time}` : time;
  }
  const reps = t.reps ? `${t.sets} × ${t.reps}` : `${t.sets} sets`;
  if (t.assist_kg != null) return `${reps} · ${n1(t.assist_kg)} kg help`;
  if (t.weight_kg) return `${reps} · ${n1(t.weight_kg)} kg`;
  return reps;
}
