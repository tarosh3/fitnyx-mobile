import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { projectToBox, thinForDisplay, type LngLatPair } from '@/src/features/roam/routeGeometry';

// The graphic layers of the share cards: grain, light blooms, the neon
// route, the workout's set bars, and the measured slot they sit in.

const GRAIN_TILE = 120; // logical size of one noise tile (white noise tiles seamlessly)

/**
 * Film grain over the whole card, laid as a grid of tiles — resizeMode
 * "repeat" drew a single tile, leaving a visibly lighter square.
 */
export function Grain({ tone, width, height }: { tone: 'light' | 'dark'; width: number; height: number }) {
  const source = tone === 'light' ? require('@/assets/images/share/grain-light.png') : require('@/assets/images/share/grain-dark.png');
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += GRAIN_TILE) for (let x = 0; x < width; x += GRAIN_TILE) tiles.push({ x, y });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tiles.map((t) => (
        <Image key={`${t.x}-${t.y}`} source={source} style={{ position: 'absolute', left: t.x, top: t.y, width: GRAIN_TILE, height: GRAIN_TILE }} />
      ))}
    </View>
  );
}

/** Two soft light blooms (top-right, bottom-left) — the "Glow" look. */
export function Glows({ width, height, a, b }: { width: number; height: number; a: string; b: string }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="ga" cx="92%" cy="4%" rx="78%" ry="58%" fx="92%" fy="4%">
          <Stop offset="0" stopColor={a} stopOpacity={0.62} />
          <Stop offset="0.55" stopColor={a} stopOpacity={0.14} />
          <Stop offset="1" stopColor={a} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="gb" cx="0%" cy="100%" rx="80%" ry="52%" fx="0%" fy="100%">
          <Stop offset="0" stopColor={b} stopOpacity={0.42} />
          <Stop offset="0.6" stopColor={b} stopOpacity={0.08} />
          <Stop offset="1" stopColor={b} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#ga)" />
      <Rect width={width} height={height} fill="url(#gb)" />
    </Svg>
  );
}

/** The route as a neon line whose colour flows from start to end, with a soft glow. */
export function NeonRoute({
  route,
  width,
  height,
  colors,
  glow = true,
  stroke = 4,
  pad = 16,
  dot,
}: {
  route: LngLatPair[];
  width: number;
  height: number;
  colors: readonly [string, string, string];
  glow?: boolean;
  stroke?: number;
  pad?: number;
  /** Fill of the start/finish dots. */
  dot: string;
}) {
  const pts = projectToBox(thinForDisplay(route, 700), width, height, pad);
  if (pts.length < 2) return null;
  const d = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="rt" gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={ex} y2={ey}>
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="0.5" stopColor={colors[1]} />
          <Stop offset="1" stopColor={colors[2]} />
        </LinearGradient>
      </Defs>
      {glow ? <Path d={d} stroke="url(#rt)" strokeOpacity={0.12} strokeWidth={stroke * 5} {...line} /> : null}
      {glow ? <Path d={d} stroke="url(#rt)" strokeOpacity={0.28} strokeWidth={stroke * 2.4} {...line} /> : null}
      <Path d={d} stroke="url(#rt)" strokeWidth={stroke} {...line} />
      <Circle cx={sx} cy={sy} r={stroke + 2.5} fill={dot} stroke={colors[0]} strokeWidth={2.5} />
      <Circle cx={ex} cy={ey} r={stroke + 2.5} fill={colors[2]} stroke={dot} strokeWidth={2.5} />
    </Svg>
  );
}

/**
 * Fills the space left between a card's fixed parts and hands its exact size
 * to the visual (route / bars), so it can never overlap the text on any route
 * shape or format.
 */
export function Measured({ children }: { children: (width: number, height: number) => React.ReactNode }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View style={styles.measured} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && size.h > 20 ? children(size.w, size.h) : null}
    </View>
  );
}

/**
 * "The shape of the workout": one glowing bar per set in the order done, as
 * tall as its load — the workout's answer to a Roam's route line.
 */
export function SetBars({ loads, width, height, colors, glow = true }: { loads: number[]; width: number; height: number; colors: readonly [string, string, string]; glow?: boolean }) {
  if (loads.length === 0) return null;
  const n = Math.min(loads.length, 40);
  const shown = loads.slice(0, n);
  const max = Math.max(...shown);
  const gap = n > 20 ? 3 : 6;
  const barW = Math.min(26, (width - gap * (n - 1)) / n);
  const total = barW * n + gap * (n - 1);
  const x0 = (width - total) / 2;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="bar" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={colors[2]} />
          <Stop offset="0.6" stopColor={colors[1]} />
          <Stop offset="1" stopColor={colors[0]} />
        </LinearGradient>
      </Defs>
      {shown.map((load, i) => {
        const h = Math.max(height * 0.16, (load / max) * height * 0.92);
        const x = x0 + i * (barW + gap);
        const r = Math.min(barW / 2, 6);
        return (
          <React.Fragment key={i}>
            {glow ? <Rect x={x - 3} y={height - h - 3} width={barW + 6} height={h + 3} rx={r + 3} fill="url(#bar)" opacity={0.18} /> : null}
            <Rect x={x} y={height - h} width={barW} height={h} rx={r} fill="url(#bar)" />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  measured: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
