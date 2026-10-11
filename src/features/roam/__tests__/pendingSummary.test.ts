jest.mock('@/src/lib/offline/syncEngine', () => ({ onOfflineSync: () => () => {} }));
jest.mock('@/src/lib/api/activities', () => ({ listActivities: jest.fn() }));

import { computeStats, type RoamPoint } from '@/src/features/roam/geo';
import { pendingSummary } from '@/src/features/roam/useRoamActivities';

const points: RoamPoint[] = [
  [19.07, 72.87, 0, 5, 0],
  [19.071, 72.87, 30, 5, 0],
  [19.072, 72.87, 60, 5, 0],
];

it('summarises a queued Roam with the same rules as the live screen', () => {
  const s = pendingSummary({
    client_activity_id: 'c1',
    activity_type: 'run',
    started_at: '2026-10-12T01:00:00.000Z',
    ended_at: '2026-10-12T01:02:00.000Z',
    local_date: '2026-10-12',
    points,
  });
  const stats = computeStats(points, 'run');
  expect(s.id).toBe('pending-c1');
  expect(s.distance_m).toBe(stats.distanceM);
  expect(s.moving_time_sec).toBe(stats.movingTimeSec);
  expect(s.elapsed_time_sec).toBe(120);
  expect(s.xp).toBe(0);
});
