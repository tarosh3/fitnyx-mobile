import React from 'react';

import { RoamStatsPanel } from '@/src/features/roam/components/RoamStatsPanel';
import type { ActivitySummary } from '@/src/lib/api/activities';

/** Saved Roam metrics (server-computed). */
export function ActivityStats({ activity }: { activity: ActivitySummary }) {
  return (
    <RoamStatsPanel
      distanceM={activity.distance_m}
      movingSec={activity.moving_time_sec}
      elapsedSec={activity.elapsed_time_sec}
      avgSpeedMps={activity.avg_speed_mps}
      maxSpeedMps={activity.max_speed_mps}
      vehicleDetected={activity.vehicle_detected}
      xp={{ earned: activity.xp, eligible: activity.xp_eligible }}
    />
  );
}
