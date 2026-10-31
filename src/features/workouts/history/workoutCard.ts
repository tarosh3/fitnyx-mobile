import { workoutFocus } from '@/src/features/share/artwork';
import { setLoad, workoutCardData, type ShareCardData } from '@/src/features/share/cardData';
import type { ExerciseGroup } from '@/src/features/workouts/history/useSessionDetail';
import { describeSet, type SessionTotals, workoutXp } from '@/src/features/workouts/model';
import type { ExerciseLog, WorkoutSession } from '@/src/lib/api/workoutSessions';
import type { TrackingType } from '@/src/types/exercise';

interface SessionCardInput {
  session: WorkoutSession;
  logs: ExerciseLog[];
  groups: ExerciseGroup[];
  totals: SessionTotals;
  typeOf: (uuid: string) => TrackingType;
}

/** The achievement card for one workout: each exercise with its best set, records first. */
export function sessionCardData(name: string, { session, logs, groups, totals: t, typeOf }: SessionCardInput): ShareCardData {
  const best = (l: ExerciseLog) => (l.weight_kg ?? 0) * 1000 + l.reps + (l.distance_m ?? 0) + (l.duration_sec ?? 0);
  const rows = groups
    .map((g) => {
      const top = g.logs.reduce((a, b) => (best(b) > best(a) ? b : a), g.logs[0]);
      return {
        name: g.exercise?.title ?? 'Exercise',
        detail: describeSet(typeOf(g.uuid), top),
        pr: g.logs.some((l) => l.is_pr),
        sets: g.logs.length,
      };
    })
    .sort((a, b) => Number(b.pr) - Number(a.pr) || b.sets - a.sets)
    .map(({ name: n, detail, pr }) => ({ name: n, detail, pr }));
  const cardioOnly = t.volumeKg === 0 && t.cardioSec > 0;
  return workoutCardData({
    name,
    focus: workoutFocus(
      groups.map((group) => ({
        title: group.exercise?.title ?? '',
        muscles: group.exercise?.primary_muscles?.map((muscle) => muscle.name),
        category: group.exercise?.category,
        trackingType: typeOf(group.uuid),
        sets: group.logs.length,
      })),
    ),
    startedAt: session.started_at,
    durationSec: session.total_duration_sec,
    volumeKg: t.volumeKg,
    distanceM: cardioOnly ? t.distanceM : 0,
    sets: t.sets,
    prs: t.prs,
    rows,
    bars: [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(setLoad),
    xp: workoutXp(session.total_duration_sec, t.volumeKg),
  });
}
