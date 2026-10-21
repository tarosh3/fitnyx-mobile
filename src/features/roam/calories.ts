import { resolveType, type ActivityType } from '@/src/features/roam/geo';

// (km/h, MET) points per type, from the Compendium of Physical Activities.
// Mirrors backend internal/activity/calories.go — change both together; the
// backend's number is the one saved.
const MET_BY_SPEED: Record<Exclude<ActivityType, 'stride'>, [number, number][]> = {
  walk: [[3.2, 2.8], [4.0, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0]],
  run: [[6.4, 6.0], [8.0, 8.3], [9.7, 9.8], [10.8, 10.5], [11.3, 11.0], [12.9, 11.8], [14.5, 12.8], [16.1, 14.5], [17.7, 16.0], [19.3, 19.0]],
  cycle: [[12, 4.0], [17.5, 6.8], [20.9, 8.0], [24.1, 10.0], [28.2, 12.0], [32.2, 15.8]],
};

/** MET of moving at kmh: interpolated between the table's points, clamped outside them. */
export function met(type: Exclude<ActivityType, 'stride'>, kmh: number): number {
  const pts = MET_BY_SPEED[type];
  if (!pts) return 0;
  if (kmh <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (kmh <= pts[i][0]) {
      const [a, b] = [pts[i - 1], pts[i]];
      return a[1] + ((b[1] - a[1]) * (kmh - a[0])) / (b[0] - a[0]);
    }
  }
  return pts[pts.length - 1][1];
}

/** Calories a Roam burned: MET × 3.5 × kg / 200 per minute of moving time, at the average moving speed. A Stride uses the type it is saved as. */
export function roamKcal(type: ActivityType, distanceM: number, movingSec: number, weightKg: number | null | undefined): number {
  if (!weightKg || weightKg <= 0 || movingSec <= 0) return 0;
  const kmh = (distanceM / movingSec) * 3.6;
  return Math.round(((met(resolveType(type, distanceM, movingSec), kmh) * 3.5 * weightKg) / 200) * (movingSec / 60));
}
