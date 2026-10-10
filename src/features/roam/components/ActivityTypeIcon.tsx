import { Bike, Footprints, PersonStanding, type LucideIcon } from 'lucide-react-native';

import type { ActivityType } from '@/src/features/roam/geo';

export const ACTIVITY_LABEL: Record<ActivityType, string> = { run: 'Run', walk: 'Walk', cycle: 'Ride' };

const ICON: Record<ActivityType, LucideIcon> = { run: Footprints, walk: PersonStanding, cycle: Bike };

export function ActivityTypeIcon({ type, size = 20, color }: { type: ActivityType; size?: number; color: string }) {
  const Icon = ICON[type];
  return <Icon size={size} color={color} />;
}
