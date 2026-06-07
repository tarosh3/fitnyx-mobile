// Progressive-overload suggestion for the next set.
// Reps-based by default; refined by RPE when the last set logged one.

export interface SetBaseline {
  weightKg: number;
  reps: number;
  rpe?: number | null;
}

export interface Suggestion {
  weightKg: number;
  reps: number;
}

const INCREMENT_KG = 2.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Suggest the next set from the last performance.
 * - RPE-aware: an easy last set (RPE <= 7) bumps the weight more; a hard one
 *   (RPE >= 9) holds. RPE 8 (or none) falls through to the reps rule.
 * - Reps rule: hit the target reps -> +2.5kg at the same reps; otherwise hold
 *   the weight and add a rep.
 * Returns null when there's no usable baseline (no/zero weight).
 */
export function computeSuggestion(
  baseline: SetBaseline | null | undefined,
  targetReps = 8,
): Suggestion | null {
  if (!baseline || !Number.isFinite(baseline.weightKg) || baseline.weightKg <= 0) {
    return null;
  }
  const { weightKg, reps, rpe } = baseline;

  if (rpe != null) {
    if (rpe >= 9) return { weightKg, reps };
    if (rpe <= 7) return { weightKg: round2(weightKg + 2 * INCREMENT_KG), reps };
  }

  if (reps >= targetReps) {
    return { weightKg: round2(weightKg + INCREMENT_KG), reps };
  }
  return { weightKg, reps: reps + 1 };
}
