/** Badges and record formatting for the trophy case. Pure, unit-tested. */
import type { ProgressSummary } from '@/src/lib/api/progress';
import { addDays } from './range';

export interface Badge {
  id: string;
  /** Short text drawn inside the medal. */
  mark: string;
  name: string;
  /** How to earn it, or how far along the user is. */
  detail: string;
  earned: boolean;
  /** 0–1 */
  progress: number;
}

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

function goal(id: string, mark: string, name: string, have: number, need: number, unit: string, howTo: string): Badge {
  const earned = have >= need;
  return {
    id, mark, name, earned,
    progress: Math.min(1, need > 0 ? have / need : 0),
    detail: earned ? howTo : `${fmt(have)} of ${fmt(need)} ${unit}`,
  };
}

/** Every badge, earned first (in list order), then the closest to being earned. */
export function badgesFor(s: ProgressSummary): Badge[] {
  const km = s.lifetime.distance_m / 1000;
  const fiveK = s.records.efforts.find((e) => e.km === 5);
  const topLift = Math.max(0, ...s.records.lifts.map((l) => l.e1rm_kg));
  const list: Badge[] = [
    goal('first-workout', '1', 'First Step', s.lifetime.workouts, 1, 'workouts', 'Finished a first workout'),
    goal('first-roam', 'GO', 'First Roam', s.lifetime.roams, 1, 'Roams', 'Saved a first Roam'),
    goal('workouts-25', '25', 'Regular', s.lifetime.workouts, 25, 'workouts', '25 workouts done'),
    goal('workouts-100', '100', 'Iron 100', s.lifetime.workouts, 100, 'workouts', '100 workouts done'),
    goal('streak-4', '4W', 'Month Strong', s.streak.best_weeks, 4, 'weeks in a row', 'Trained 4 weeks in a row'),
    goal('streak-12', '12W', 'Unbroken', s.streak.best_weeks, 12, 'weeks in a row', 'Trained 12 weeks in a row'),
    goal('km-100', 'KM', '100 km Club', km, 100, 'km', '100 km of Roams'),
    goal('tonnes-10', '10T', 'Ten Tonnes', s.lifetime.volume_kg, 10000, 'kg lifted', '10,000 kg lifted in total'),
    goal('lift-100', 'KG', 'Triple Digits', topLift, 100, 'kg best 1RM', 'A 100 kg estimated 1-rep max'),
    {
      id: 'sub-25-5k', mark: '5K', name: 'Sub-25 5K',
      earned: !!fiveK && fiveK.sec < 25 * 60,
      progress: fiveK ? Math.min(1, (25 * 60) / fiveK.sec) : 0,
      detail: !fiveK ? 'Run 5 km in one Roam' : fiveK.sec < 25 * 60 ? '5 km in under 25 minutes' : `Best 5 km ${formatClock(fiveK.sec)}`,
    },
  ];
  const earned = list.filter((b) => b.earned);
  const open = list.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress);
  return [...earned, ...open];
}

/** 332 → "5:32", 3725 → "1:02:05". */
export function formatClock(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export const effortName = (km: number) => (km === 21 ? 'Fastest half marathon' : `Fastest ${km} km`);

/** A record set within the last 30 days counts as new. */
export const isRecent = (date: string, today: string) => date >= addDays(today, -29);

/** 86.533 → "86.5", 112 → "112". */
export const formatKg = (kg: number) => (Math.round(kg * 10) / 10).toString();
