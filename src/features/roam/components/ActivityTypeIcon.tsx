import { Bike, Footprints, type LucideIcon } from 'lucide-react-native';

import type { ActivityType } from '@/src/features/roam/geo';

// Runs and walks are one activity in the app: Stride.
export const ACTIVITY_LABEL: Record<ActivityType, string> = { stride: 'Stride', run: 'Stride', walk: 'Stride', cycle: 'Ride' };

const ICON: Record<ActivityType, LucideIcon> = { stride: Footprints, run: Footprints, walk: Footprints, cycle: Bike };

export function ActivityTypeIcon({ type, size = 20, color }: { type: ActivityType; size?: number; color: string }) {
  const Icon = ICON[type];
  return <Icon size={size} color={color} />;
}
