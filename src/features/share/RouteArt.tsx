import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { projectToBox, thinForDisplay, type LngLatPair } from '@/src/features/roam/routeGeometry';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** The route as glowing line art (no map tiles — nothing to load, nothing to credit). */
export function RouteArt({ route, width, height }: { route: LngLatPair[]; width: number; height: number }) {
  const c = useThemeColors();
  const pts = projectToBox(thinForDisplay(route, 600), width, height, 18);
  if (pts.length < 2) return null;
  const d = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={c.primary} strokeOpacity={0.18} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke={c.primary} strokeOpacity={0.35} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke={c.hero.accent} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={sx} cy={sy} r={7} fill={c.primary} stroke={c.hero.text} strokeWidth={2.5} />
      <Circle cx={ex} cy={ey} r={7} fill={c.hero.text} stroke={c.primary} strokeWidth={2.5} />
    </Svg>
  );
}
