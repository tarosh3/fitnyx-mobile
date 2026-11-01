import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ActivitySketch } from './ActivitySketch';
import type { ShareCardData } from '../cardData';
import { Label, Wordmark } from './parts';
import { share } from '@/src/theme/colors';

export const SKETCH = share.sketch;
export const HAND = 'PatrickHand';
export interface ArtworkCallbacks {
  onArtworkLoad?: () => void;
  onArtworkError?: () => void;
}

export const DoodleArt = ActivitySketch;

export function SketchArrow({ color = SKETCH.ink, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M3 20 Q9 15 20 4 M10 4 L21 3 L20 14 M5 21 L18 7"
        stroke={color}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Scribble({ width = 308, color = SKETCH.ink }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={8} viewBox="0 0 308 8" accessible={false}>
      <Path d="M2 4 Q64 1 125 4 T305 3 M5 6 Q119 3 205 6 T302 5" stroke={color} strokeWidth={0.8} fill="none" opacity={0.65} />
    </Svg>
  );
}

/** Hand-drawn stopwatch: no emoji glyphs or decorative faces. */
export function EffortMark({ color = SKETCH.ink, size = 36 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Circle cx={20} cy={23} r={13} stroke={color} strokeWidth={1.4} fill="none" />
      <Path
        d="M11 13 Q24 4 33 20 M17 3 L24 3 M20 3 L20 9 M29 10 L33 7 M20 14 L20 24 L27 27 M7 28 L4 30 M11 34 L9 37"
        stroke={color}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HandNote({ children, color = SKETCH.green, size = 19 }: { children: React.ReactNode; color?: string; size?: number }) {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontFamily: HAND, fontSize: size, lineHeight: size * 1.2, color }}
    >
      {children}
    </Text>
  );
}

export function SketchHeader({ data, color = SKETCH.ink }: { data: ShareCardData; color?: string }) {
  return (
    <View style={s.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SKETCH.green }} />
        <Label color={color} size={8}>{`${data.kicker} / COMPLETE`}</Label>
      </View>
      <Label color={color} size={8}>
        {data.date.toUpperCase()}
      </Label>
    </View>
  );
}

export function SketchFooter({ color = SKETCH.ink, muted = SKETCH.muted }: { color?: string; muted?: string }) {
  return (
    <View style={s.footer}>
      <View style={{ gap: 4 }}>
        <Label color={muted} size={6}>
          A LITTLE BETTER, EVERY DAY.
        </Label>
        <Wordmark color={color} accent={color} size={21} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <HandNote color={color} size={15}>
            your turn
          </HandNote>
          <SketchArrow color={color} size={16} />
        </View>
        <Label color={muted} size={7}>
          TRACK WITH FITNYX
        </Label>
      </View>
    </View>
  );
}
export function NotebookLines({ height }: { height: number }) {
  return (
    <Svg width={360} height={height} style={StyleSheet.absoluteFill} accessible={false}>
      {Array.from({ length: Math.ceil(height / 24) }, (_, i) => (
        <Path key={i} d={`M0 ${i * 24 + 10} H360`} stroke={SKETCH.notebookLine} strokeWidth={0.6} />
      ))}
      <Path d={`M21 0 V${height}`} stroke={SKETCH.notebookMargin} strokeWidth={0.8} />
    </Svg>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
