import type { ShareCardData } from './cardData';

export type ArtworkAppearance = 'equipment' | 'woman' | 'man';
export type WorkoutFocus = 'push' | 'pull' | 'legs' | 'core' | 'mobility' | 'full-body' | 'cardio';
export type ArtworkSubject = WorkoutFocus | 'walk' | 'jog' | 'run' | 'cycle' | 'cycle-fast';
export type ArtworkSelection = 'auto' | ArtworkAppearance;

export const ART_SUBJECTS: ArtworkSubject[] = [
  'push',
  'pull',
  'legs',
  'core',
  'mobility',
  'full-body',
  'walk',
  'jog',
  'run',
  'cycle',
  'cycle-fast',
  'cardio',
];

/** Appearance only; never infer gender from a name, photo, sport, or performance. */
export function profileAppearance(gender?: string | null): ArtworkAppearance {
  if (gender === 'female') return 'woman';
  if (gender === 'male') return 'man';
  return 'equipment';
}

export interface ExerciseArtInput {
  title: string;
  muscles?: string[];
  category?: string;
  trackingType?: string;
  sets: number;
}

/** Use the actual exercises, weighted by logged sets; a session name is not evidence. */
export function workoutFocus(exercises: ExerciseArtInput[]): WorkoutFocus {
  const scores: Record<WorkoutFocus, number> = { push: 0, pull: 0, legs: 0, core: 0, mobility: 0, 'full-body': 0, cardio: 0 };
  for (const exercise of exercises) {
    if (exercise.sets <= 0) continue;
    const name = exercise.title.toLowerCase();
    const metadata = `${exercise.category ?? ''} ${(exercise.muscles ?? []).join(' ')}`.toLowerCase();
    let focus: WorkoutFocus = 'full-body';
    // Specific movement names win over broad catalog categories (e.g. a plank tagged strength).
    if (/yoga|stretch|mobility|flexibility/.test(`${name} ${metadata}`)) focus = 'mobility';
    else if (/plank|crunch|ab wheel|sit.?up|leg raise|russian twist|dead bug|hollow hold/.test(name)) focus = 'core';
    else if (exercise.trackingType === 'cardio' || /treadmill|cycling|running|jump rope|skipping|elliptical|rowing machine/.test(name))
      focus = 'cardio';
    else if (/squat|lunge|leg press|leg curl|leg extension|calf raise|calf press|hip thrust|romanian deadlift/.test(name)) focus = 'legs';
    else if (/push.?up|press|chest fly|tricep|dip|lateral raise/.test(name)) focus = 'push';
    else if (/pull.?up|chin.?up|pulldown|row|bicep|hammer curl|face pull/.test(name)) focus = 'pull';
    else if (/abdom|core|oblique/.test(metadata)) focus = 'core';
    else if (/quadricep|hamstring|glute|calves|legs|lower body/.test(metadata)) focus = 'legs';
    else if (/chest|pectoral|shoulder|deltoid|tricep/.test(metadata)) focus = 'push';
    else if (/back|latissimus|bicep|trapez|rhomboid/.test(metadata)) focus = 'pull';
    scores[focus] += exercise.sets;
  }
  const ranked = (Object.entries(scores) as [WorkoutFocus, number][]).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  // Mixed sessions retain full-body artwork rather than arbitrarily choosing one body part.
  return total > 0 && ranked[0][1] / total >= 0.5 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : 'full-body';
}

/** Decorative pose thresholds, not training zones or an assessment of fitness. */
export function artworkSubject(data: ShareCardData): ArtworkSubject {
  if (data.kind === 'workout') return data.workoutFocus ?? 'full-body';
  const speed = Number.isFinite(data.avgSpeedMps) && (data.avgSpeedMps ?? 0) > 0 ? data.avgSpeedMps! : undefined;
  const pace = Number.isFinite(data.avgPaceSecPerKm) && (data.avgPaceSecPerKm ?? 0) > 0 ? data.avgPaceSecPerKm! : undefined;
  if (data.activityType === 'cycle') return speed !== undefined && speed * 3.6 >= 22 ? 'cycle-fast' : 'cycle';
  if (data.activityType === 'walk') return 'walk';
  if (data.activityType === 'stride' && ((pace !== undefined && pace >= 600) || (pace === undefined && speed !== undefined && speed < 1.8)))
    return 'walk';
  return (pace !== undefined ? pace <= 330 : speed !== undefined && speed >= 1000 / 330) ? 'run' : 'jog';
}

export function artworkChoices(data: ShareCardData): ArtworkSubject[] {
  if (data.kind === 'workout') return ['push', 'pull', 'legs', 'core', 'mobility', 'full-body', 'cardio'];
  return data.activityType === 'cycle' ? ['cycle', 'cycle-fast'] : ['walk', 'jog', 'run'];
}

export const ARTWORK_LABELS: Record<ArtworkSubject, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Leg day',
  core: 'Core',
  mobility: 'Mobility',
  'full-body': 'Full body',
  cardio: 'Cardio',
  walk: 'Walking',
  jog: 'Jogging',
  run: 'Running',
  cycle: 'Cruising',
  'cycle-fast': 'In motion',
};
