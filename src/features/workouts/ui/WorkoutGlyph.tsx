import { HeartPulse } from 'lucide-react-native';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Part } from '@/src/features/workouts/model';

// A recognition symbol, rather than an exercise demonstration or anatomy chart.
const regions: Record<Exclude<Part, 'cardio'>, string> = {
  chest: 'M12 11.6 Q14 10.8 15.4 12 V15 Q13.5 15.8 12 14.6 Z M20 11.6 Q18 10.8 16.6 12 V15 Q18.5 15.8 20 14.6 Z',
  back: 'M12 11.5 L15.4 12.8 V20 L12.5 17.2 Z M20 11.5 L16.6 12.8 V20 L19.5 17.2 Z',
  legs: 'M12 21 H15 L13.5 28 H11.2 Z M20 21 H17 L18.5 28 H20.8 Z',
  shoulders: 'M12.8 10.2 Q10.4 10.2 9.3 13.6 L11.6 14.1 L13.1 11.6 Z M19.2 10.2 Q21.6 10.2 22.7 13.6 L20.4 14.1 L18.9 11.6 Z',
  arms: 'M8.9 15 L11 15.6 L9 21 L7.3 20.4 Z M23.1 15 L21 15.6 L23 21 L24.7 20.4 Z',
  core: 'M13 16.4 H19 L18.5 20.5 H13.5 Z',
};

/** Shared body-part marker. The surrounding control supplies its text label. */
export function WorkoutGlyph({ part, size = 24, color }: { part: Part; size?: number; color: string }) {
  if (part === 'cardio') return <HeartPulse size={size} color={color} strokeWidth={1.8} accessible={false} />;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} pointerEvents="none">
      <Circle cx={16} cy={5} r={2.6} fill="none" stroke={color} strokeWidth={1.35} opacity={0.45} />
      <Path
        d="M13.5 9 H18.5 L22.5 11 L25.5 21 L23 22 L20.5 15 V21 L22 29 H18 L16 22 L14 29 H10 L11.5 21 V15 L9 22 L6.5 21 L9.5 11 Z"
        fill="none" stroke={color} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" opacity={0.45}
      />
      <Path d={regions[part]} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1.35} strokeLinejoin="round" />
      {part === 'core' ? <Path d="M16 16.6 V20.2 M13.5 18.5 H18.5" stroke={color} strokeWidth={0.8} /> : null}
    </Svg>
  );
}
