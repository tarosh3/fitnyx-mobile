import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

const LABEL_W = 48;

export interface BarDatum {
  label: string;
  /** Stacked bottom → top. */
  parts: { value: number; color: string }[];
  highlight?: boolean;
}

/**
 * Bars on a shared time axis. Empty buckets keep a stub so gaps read as rest,
 * not missing data. `target` draws a dashed reference line (same units).
 */
export function Bars({ data, height = 120, target, accessibilityLabel }: { data: BarDatum[]; height?: number; target?: number; accessibilityLabel: string }) {
  const c = useThemeColors();
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.parts.reduce((a, p) => a + p.value, 0)));
  const n = data.length;
  const gap = n > 60 ? 1 : n > 30 ? 2 : n > 14 ? 4 : n > 8 ? 6 : 10;
  const radius = n > 30 ? 2 : 5;
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {target ? <View pointerEvents="none" style={[styles.target, { bottom: (target / max) * height, borderColor: c.mutedText }]} /> : null}
        {data.map((d, i) => {
          const total = d.parts.reduce((a, p) => a + p.value, 0);
          return (
            <View key={i} style={styles.col}>
              {total === 0 ? <View style={{ height: 3, borderRadius: 2, backgroundColor: c.progress.empty }} /> : null}
              {[...d.parts].reverse().map((p, j) => (p.value > 0 ? (
                <View key={j} style={{ height: Math.max(2, (p.value / max) * height), borderRadius: radius, backgroundColor: p.color, marginTop: j > 0 ? (n > 30 ? 1 : 2) : 0, opacity: d.highlight === false ? 0.55 : 1 }} />
              ) : null))}
            </View>
          );
        })}
      </View>
      {/* Labels are sparse and wider than thin bars, so each is centred under its bar. */}
      <View style={styles.labels}>
        {data.map((d, i) => (d.label ? (
          <Text key={i} numberOfLines={1} maxFontSizeMultiplier={1.2}
            style={[styles.label, i === n - 1 && n > 1 ? styles.labelEnd : i === 0 && n > 7 ? styles.labelStart : { left: `${((i + 0.5) / n) * 100}%`, marginLeft: -LABEL_W / 2 },
              { color: i === n - 1 ? c.text : c.mutedText }]}>{d.label}</Text>
        ) : null))}
      </View>
    </View>
  );
}

/**
 * A line with a soft area under it and a dot on the latest value. `invert`
 * puts lower values higher (pace: faster is up). `goal` adds a dashed line.
 */
export function LineChart({ values, color, height = 120, invert, goal, min, max, accessibilityLabel }: {
  values: number[]; color: string; height?: number; invert?: boolean; goal?: number | null; min?: number; max?: number; accessibilityLabel: string;
}) {
  const c = useThemeColors();
  const [width, setWidth] = useState(0);
  const all = goal != null ? [...values, goal] : values;
  // A flat series sits mid-chart, not on the floor.
  const flat = Math.min(...all) === Math.max(...all);
  const lo = min ?? Math.min(...all) - (flat ? 1 : 0);
  const hi = max ?? Math.max(...all) + (flat ? 1 : 0);
  const span = hi - lo || 1;
  const padX = 6;
  const padY = 10;
  const x = (i: number) => padX + (values.length < 2 ? (width - padX * 2) / 2 : (i * (width - padX * 2)) / (values.length - 1));
  const y = (v: number) => {
    const t = (v - lo) / span;
    return padY + (invert ? t : 1 - t) * (height - padY * 2);
  };
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = values.length > 1 ? `${line} L${x(values.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z` : '';
  const last = values.length - 1;
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length > 0 ? (
        <Svg width={width} height={height}>
          {goal != null ? <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={c.mutedText} strokeWidth={1.5} strokeDasharray="4 6" /> : null}
          {area ? <Path d={area} fill={color} opacity={0.12} /> : null}
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={x(last)} cy={y(values[last])} r={5} fill={color} stroke={c.card} strokeWidth={3} />
        </Svg>
      ) : null}
    </View>
  );
}

/** A tiny trend line for list rows. */
export function Sparkline({ values, color, width = 72, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i * (width - 4)) / (values.length - 1) + 2).toFixed(1)} ${(3 + (1 - (v - lo) / span) * (height - 6)).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1, minWidth: 0, justifyContent: 'flex-end', height: '100%' },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  labels: { height: 16, marginTop: 8 },
  label: { position: 'absolute', top: 0, width: LABEL_W, fontFamily: type.weight.semibold, fontSize: type.size.micro, textAlign: 'center' },
  labelEnd: { right: 0, textAlign: 'right' },
  labelStart: { left: 0, textAlign: 'left' },
});
