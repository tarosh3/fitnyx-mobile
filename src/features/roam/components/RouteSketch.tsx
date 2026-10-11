import { WifiOff } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { projectToBox, thinForDisplay, type LngLatPair } from '@/src/features/roam/routeGeometry';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type as t } from '@/src/styles/tokens';

interface Props {
  route: LngLatPair[];
  vehicleRanges: [number, number][];
  /** Recording in progress (no end marker; the badge says it's still recording). */
  live: boolean;
}

const PAD = 28;
// Room above the drawing for the badge, so the route never runs under it.
const BADGE_SPACE = 32;

/** The route drawn without map tiles — shown while the map can't load (offline). */
export function RouteSketch({ route, vehicleRanges, live }: Props) {
  const c = useThemeColors();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const drawn = useMemo(() => thinForDisplay(route), [route]);
  const pts = useMemo(() => projectToBox(drawn, size.w, size.h - BADGE_SPACE, PAD), [drawn, size]);
  // Vehicle ranges index the full route; map them onto the thinned one.
  const vehicle = useMemo(() => {
    if (!vehicleRanges.length || drawn.length === route.length) {
      return vehicleRanges.map(([a, b]) => pts.slice(Math.max(0, a), b + 1));
    }
    const k = (drawn.length - 1) / Math.max(1, route.length - 1);
    return vehicleRanges.map(([a, b]) => pts.slice(Math.round(a * k), Math.round(b * k) + 1));
  }, [vehicleRanges, drawn, route.length, pts]);

  const toAttr = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface }]} onLayout={onLayout}>
      {pts.length > 0 ? (
        <Svg width={size.w} height={size.h - BADGE_SPACE} style={{ marginTop: BADGE_SPACE }}>
          {pts.length > 1 ? (
            <Polyline
              points={toAttr(pts)}
              fill="none"
              stroke={c.primary}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {vehicle
            .filter((seg) => seg.length > 1)
            .map((seg, i) => (
              <Polyline
                key={i}
                points={toAttr(seg)}
                fill="none"
                stroke={c.mutedText}
                strokeWidth={5}
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
            ))}
          {first ? <Circle cx={first[0]} cy={first[1]} r={7} fill={c.primary} stroke={c.background} strokeWidth={3} /> : null}
          {!live && last && pts.length > 1 ? (
            <Circle cx={last[0]} cy={last[1]} r={7} fill={c.text} stroke={c.background} strokeWidth={3} />
          ) : null}
        </Svg>
      ) : null}
      <View style={[styles.badge, { backgroundColor: c.background }]}>
        <WifiOff size={12} color={c.mutedText} strokeWidth={2.2} />
        <Text style={[styles.badgeText, { color: c.mutedText }]}>
          {live ? 'Map offline · still recording your route' : 'Map offline'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontFamily: t.weight.semibold, fontSize: t.size.xs },
});
