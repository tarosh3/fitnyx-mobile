import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { ShareCardData } from '@/src/features/share/cardData';
import { projectToBox, thinForDisplay, type LngLatPair } from '@/src/features/roam/routeGeometry';
import { Label } from '@/src/features/share/cards/parts';
import { type } from '@/src/styles/tokens';

/** Real route geometry, north-up. A flat ink stroke exports crisply at every size. */
export function RouteArt({
  route,
  width,
  height,
  color,
  background,
  stroke = 3.5,
}: {
  route: LngLatPair[];
  width: number;
  height: number;
  color: string;
  background: string;
  stroke?: number;
}) {
  const pts = projectToBox(thinForDisplay(route, 500), width, height, 14);
  if (pts.length < 2) return null;
  const d = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={sx} cy={sy} r={5} fill={background} stroke={color} strokeWidth={2} />
      <Circle cx={ex} cy={ey} r={5} fill={color} stroke={background} strokeWidth={2} />
    </Svg>
  );
}

/** One bar per logged set, grouped if necessary; never fabricates activity. */
export function SetBars({
  loads,
  width,
  height,
  color,
  muted,
}: {
  loads: number[];
  width: number;
  height: number;
  color: string;
  muted: string;
}) {
  const valid = loads.filter((n) => Number.isFinite(n) && n > 0);
  if (!valid.length) return null;
  const count = Math.min(valid.length, 36);
  const shown = Array.from({ length: count }, (_, i) => {
    const group = valid.slice(Math.floor((i * valid.length) / count), Math.floor(((i + 1) * valid.length) / count));
    return Math.max(...group);
  });
  const max = Math.max(...shown);
  const gap = 3;
  const barW = (width - gap * (count - 1)) / count;
  return (
    <Svg width={width} height={height}>
      {shown.map((load, i) => {
        const h = Math.max(3, (load / max) * (height - 4));
        return (
          <React.Fragment key={i}>
            <Path
              d={`M${i * (barW + gap) + 1} ${height - 1} L${i * (barW + gap) + 0.8} ${height - h} L${i * (barW + gap) + barW - 1} ${height - h + 0.7} L${i * (barW + gap) + barW - 0.5} ${height - 1} Z`}
              stroke={i === shown.indexOf(max) ? color : muted}
              strokeWidth={1.2}
              fill={muted}
              fillOpacity={0.12}
            />
            {barW > 12 ? (
              <Path
                d={`M${i * (barW + gap) + 4} ${height - 2} L${i * (barW + gap) + 6} ${height - h + 3} M${i * (barW + gap) + barW / 2} ${height - 2} L${i * (barW + gap) + barW / 2 + 2} ${height - h + 3}`}
                stroke={muted}
                strokeWidth={2}
                opacity={0.5}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** Subtle survey marks frame the route without inventing a map or location. */
export function RoutePanel({
  data,
  width,
  height,
  color,
  muted,
  background,
}: {
  data: ShareCardData;
  width: number;
  height: number;
  color: string;
  muted: string;
  background: string;
}) {
  const hasRoute = (data.route?.length ?? 0) > 1;
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {[14, width - 14].flatMap((x) =>
          [14, height - 14].map((y) => (
            <React.Fragment key={`${x}-${y}`}>
              <Line x1={x - 4} x2={x + 4} y1={y} y2={y} stroke={muted} opacity={0.4} />
              <Line x1={x} x2={x} y1={y - 4} y2={y + 4} stroke={muted} opacity={0.4} />
            </React.Fragment>
          )),
        )}
      </Svg>
      {hasRoute ? (
        <RouteArt route={data.route!} width={width} height={height} color={color} background={background} />
      ) : (
        <View style={styles.empty}>
          <Label color={muted}>{data.kicker} COMPLETE</Label>
        </View>
      )}
    </View>
  );
}

export function SessionHighlight({
  data,
  color,
  muted,
  rule,
  compact = false,
}: {
  data: ShareCardData;
  color: string;
  muted: string;
  rule: string;
  compact?: boolean;
}) {
  const row = data.rows.find((r) => r.pr) ?? data.rows[0];
  if (!row) return null;
  return (
    <View style={[styles.highlight, { borderColor: rule, paddingVertical: compact ? 9 : 13 }]}>
      <View style={styles.highlightCopy}>
        <Label color={muted} size={8}>
          {row.pr ? 'PERSONAL RECORD' : 'SESSION HIGHLIGHT'}
        </Label>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.exercise, { color }]}>
          {row.name}
        </Text>
      </View>
      <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.detail, { color }]}>
        {row.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  highlight: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1 },
  highlightCopy: { flex: 1, gap: 6 },
  exercise: { fontFamily: type.weight.semibold, fontSize: 13 },
  detail: { maxWidth: '42%', fontFamily: type.weight.bold, fontSize: 15 },
});
