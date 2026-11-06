import React from 'react';

import { RoamStatsPanel } from '@/src/features/roam/components/RoamStatsPanel';
import type { ActivitySummary } from '@/src/lib/api/activities';

/** Saved Roam metrics (server-computed). */
export function ActivityStats({ activity }: { activity: ActivitySummary }) {
  return (
    <RoamStatsPanel
      movingSec={activity.moving_time_sec}
      elapsedSec={activity.elapsed_time_sec}
      maxSpeedMps={activity.max_speed_mps}
      vehicleDetected={activity.vehicle_detected}
      steps={activity.steps}
      kcal={activity.kcal}
      elevationGainM={activity.elevation_gain_m}
      avgHR={activity.avg_hr}
      maxHR={activity.max_hr}
    />
  );
}
