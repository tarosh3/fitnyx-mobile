import type { GritBreakdown } from '@/src/lib/api/workoutSessions';

/** Grit's points — mirrors backend internal/grit (the backend's number is the one saved). */
export const GRIT = { set: 10, hardSet: 5, record: 30, routine: 25, streak: 50, dailyCap: 400, minMinutes: 10 } as const;

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The summary's lines, biggest earners last so the list reads like a build-up. */
export function gritLines(b: GritBreakdown): { label: string; points: number }[] {
  const lines: { label: string; points: number }[] = [];
  if (b.sets) lines.push({ label: n(b.sets, 'set done', 'sets done'), points: b.sets * GRIT.set });
  if (b.hard_sets) lines.push({ label: n(b.hard_sets, 'hard set (RPE 8+)', 'hard sets (RPE 8+)'), points: b.hard_sets * GRIT.hardSet });
  if (b.routine) lines.push({ label: 'Every planned set done', points: GRIT.routine });
  if (b.prs) lines.push({ label: n(b.prs, 'new personal best', 'new personal bests'), points: b.prs * GRIT.record });
  if (b.streak) lines.push({ label: 'Weekly training goal reached', points: GRIT.streak });
  return lines;
}

/** A line explaining why the total is lower than the lines add up to (or zero); null when nothing to explain. */
export function gritNote(b: GritBreakdown): string | null {
  if (b.too_short) return `Workouts under ${GRIT.minMinutes} minutes don’t earn Grit.`;
  if (b.capped) return `You hit today’s cap of ${GRIT.dailyCap} Grit — rest counts too.`;
  return null;
}
