import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ReadinessBand } from '../readiness';

type Colors = ReturnType<typeof useThemeColors>;

/** Band → ring / accent colour. Insufficient reads as muted. */
export function bandColor(c: Colors, band: ReadinessBand): string {
  if (band === 'primed') return c.success;
  if (band === 'moderate') return c.warning;
  if (band === 'recover') return c.destructive;
  return c.mutedText;
}

/** A circular gauge filled to `score`/100, with whatever is centred inside it. */
export function ReadinessRing({
  score,
  color,
  track,
  size = 64,
  stroke = 6,
  children,
}: {
  score: number | null;
  color: string;
  track: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const half = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={half} cy={half} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {pct > 0 ? (
          <Circle
            cx={half}
            cy={half}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            transform={`rotate(-90 ${half} ${half})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
