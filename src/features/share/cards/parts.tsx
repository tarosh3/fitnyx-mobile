import React from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { FitNyxWordmark } from '@/src/components/brand/FitNyxWordmark';

import type { ShareCardData, ShareStat } from '@/src/features/share/cardData';
import { type } from '@/src/styles/tokens';

export type CardFormat = 'story' | 'post';
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  post: { width: 360, height: 450 },
};
/** Clear of social apps' profile header and reply controls. */
export const SAFE = {
  story: { top: 58, bottom: 84, side: 26 },
  post: { top: 24, bottom: 24, side: 26 },
} as const;
export const DISPLAY = 'Anton_400Regular';
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** The same custom wordmark used by the app's primary brand surfaces. */
export function Wordmark({ color, accent, size = 16, shadow }: { color: string; accent: string; size?: number; shadow?: TextStyle }) {
  return (
    <View style={shadow ? { shadowColor: shadow.textShadowColor, shadowOpacity: 1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } } : undefined}>
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
}: {
  stat: ShareStat;
  size: number;
  color: string;
  unitColor: string;
  shadow?: TextStyle;
}) {
  const characters = [...stat.value].reduce((sum, char) => sum + (/[.,:]/.test(char) ? 0.26 : 0.55), 0);
  const unitWidth = stat.unit ? (stat.unit.length * 0.55 + 0.4) * 0.27 : 0;
  const fitted = Math.min(size, 280 / (characters + unitWidth));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text
        allowFontScaling={false}
        style={[styles.big, { fontSize: fitted, lineHeight: fitted * 1.16, color, flexShrink: 1 }, shadow]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.45}
      >
        {stat.value}
      </Text>
      {stat.unit ? (
        <Text
          allowFontScaling={false}
          style={[{ fontFamily: DISPLAY, fontSize: fitted * 0.27, lineHeight: fitted * 0.34, color: unitColor }, shadow]}
        >
          {stat.unit}
        </Text>
      ) : null}
    </View>
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
          <Text
            allowFontScaling={false}
            style={[styles.statValue, { color }, shadow]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {s.value}
            {s.unit ? <Text style={[styles.statUnit, { color: muted, lineHeight: 12 }]}> {s.unit}</Text> : null}
          </Text>
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
  const long = title.length > 30;
  const lineHeight = (size * 1.17) / (long ? 2 : 1);
  const fontSize = long ? Math.min(18, lineHeight * 0.9) : Math.min(size, 550 / Math.max(12, title.length));
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={long ? 2 : lines}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      style={{
        fontFamily: DISPLAY,
        fontSize,
        lineHeight,
        height: size * 1.17,
        color,
        textTransform: 'uppercase',
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
  statUnit: { fontFamily: type.weight.medium, fontSize: 10 },
  pill: { alignSelf: 'flex-start', borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 0.4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completed: { flexDirection: 'row', gap: 5, alignItems: 'center' },
});
