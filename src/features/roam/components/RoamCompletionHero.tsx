import React from 'react';
import { CompletionHero } from '@/src/components/ui/CompletionHero';
import { CompletionMetrics } from '@/src/features/completion/CompletionMetrics';
import { formatDistance, formatDuration, formatSpeed } from '@/src/features/roam/geo';

export function RoamCompletionHero({ title, subtitle, eyebrow, done, seed, distanceM, movingSec, avgSpeedMps, onLongPress }: {
  title: React.ReactNode; subtitle?: string; eyebrow: string; done?: boolean; seed?: string;
  distanceM: number; movingSec: number; avgSpeedMps: number; onLongPress?: () => void;
}) {
  const [distance, unit] = formatDistance(distanceM).split(' ');
  const [speed, speedUnit] = formatSpeed(avgSpeedMps).split(' ');
  return <CompletionHero variant="roam" eyebrow={eyebrow} done={done} title={title} subtitle={subtitle} seed={seed} onLongPress={onLongPress} metric={{ value: distance, unit, label: 'Distance covered' }}>
    <CompletionMetrics items={[
      { label: 'Moving time', value: formatDuration(movingSec) },
      { label: 'Average speed', value: speed, unit: speedUnit },
    ]} />
  </CompletionHero>;
}
