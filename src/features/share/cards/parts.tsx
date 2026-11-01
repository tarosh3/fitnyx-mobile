import React from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { MetricNumber } from './MetricNumber';
import { Check } from 'lucide-react-native';

import { FitNyxWordmark } from '@/src/components/brand/FitNyxWordmark';

import type { ShareCardData, ShareStat } from '@/src/features/share/cardData';
import { share } from '@/src/theme/colors';
import { type } from '@/src/styles/tokens';

export type CardFormat = 'story' | 'post';
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  post: { width: 360, height: 450 },
};
/** Clear of social apps' profile header and reply controls. */
export const SAFE = {
  story: { top: 50, bottom: 66, side: 26 },
  post: { top: 24, bottom: 24, side: 26 },
} as const;
export const DISPLAY = 'Anton_400Regular';
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** The same custom wordmark used by the app's primary brand surfaces. */
export function Wordmark({ color, accent, size = 16, shadow }: { color: string; accent: string; size?: number; shadow?: TextStyle }) {
  return (
    <View>
      {shadow ? (
        <View style={{ position: 'absolute', top: 1, left: 1, opacity: 0.5 }}>
          <FitNyxWordmark height={size * 1.2} color={String(shadow.textShadowColor ?? share.sketch.shadow)} accessible={false} />
        </View>
      ) : null}
      <FitNyxWordmark height={size * 1.2} color={color} accentColor={accent} />
    </View>
  );
}

export function Label({
  children,
  color,
  size = 9,
  style,
}: {
  children: React.ReactNode;
  color: string;
  size?: number;
  style?: TextStyle | TextStyle[];
}) {
  return (
    <Text allowFontScaling={false} numberOfLines={1} style={[styles.label, { color, fontSize: size, letterSpacing: size * 0.15 }, style]}>
      {children}
    </Text>
  );
}

export function BigNumber({
  stat,
  size,
  color,
  unitColor,
  shadow,
  centered = false,
}: {
  stat: ShareStat;
  centered?: boolean;
  size: number;
  color: string;
  unitColor: string;
  shadow?: TextStyle;
}) {
  return (
    <MetricNumber value={stat.value} unit={stat.unit} size={size} color={color} unitColor={unitColor} centered={centered} shadow={shadow} />
  );
}

export function StatRow({
  stats,
  color,
  muted,
  rule,
  shadow,
}: {
  stats: ShareStat[];
  color: string;
  muted: string;
  rule: string;
  shadow?: TextStyle;
}) {
  return (
    <View style={styles.stats}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: rule, paddingLeft: 12 }]}>
          <Label color={muted} size={8} style={shadow}>
            {s.label.toUpperCase()}
          </Label>
          <MetricNumber
            value={s.value}
            unit={s.unit}
            size={24}
            unitScale={0.38}
            maxWidth={(280 - (stats.length - 1) * 12) / stats.length - 6}
            color={color}
            unitColor={muted}
            shadow={shadow}
          />
        </View>
      ))}
    </View>
  );
}

export function Pill({ text, color, bg, border }: { text: string; color: string; bg: string; border: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text allowFontScaling={false} style={[styles.pillText, { color }]}>
        {text}
      </Text>
    </View>
  );
}

export function CardTitle({ title, color, size = 32, lines = 1 }: { title: string; color: string; size?: number; lines?: number }) {
  const lineCount = title.length > 26 ? 2 : lines;
  const boxHeight = size * 1.18 * lines;
  const fontSize = lineCount > lines ? Math.min(23, (boxHeight / 2) * 0.9) : size;
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={lineCount}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={{
        fontFamily: 'PatrickHand',
        fontSize,
        lineHeight: boxHeight / lineCount,
        height: boxHeight,
        color,
        includeFontPadding: false,
      }}
    >
      {title}
    </Text>
  );
}

export function CardFooter({ data, color, muted }: { data: ShareCardData; color: string; muted: string }) {
  return (
    <View style={styles.footer}>
      <Wordmark color={color} accent={color} size={15} />
      <Label color={muted} size={8}>
        {data.badge ? `${data.badge}  /  EARNED` : 'MAKE IT COUNT.'}
      </Label>
    </View>
  );
}

export function Completed({ color, label = 'SESSION COMPLETE' }: { color: string; label?: string }) {
  return (
    <View style={styles.completed}>
      <Check size={12} strokeWidth={2.5} color={color} />
      <Label color={color} size={8}>
        {label}
      </Label>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: type.weight.semibold, includeFontPadding: false },
  big: { fontFamily: DISPLAY, letterSpacing: -2, includeFontPadding: false },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, gap: 6, paddingRight: 6, minWidth: 0 },
  statValue: { fontFamily: DISPLAY, fontSize: 24, lineHeight: 29, includeFontPadding: false },
  statUnit: { fontFamily: type.weight.medium, fontSize: type.size.micro },
  pill: { alignSelf: 'flex-start', borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 0.4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completed: { flexDirection: 'row', gap: 5, alignItems: 'center' },
});
