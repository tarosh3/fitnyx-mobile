import React from 'react';
import { Image, Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';

import type { ShareStat } from '@/src/features/share/cardData';
import { type } from '@/src/styles/tokens';

export type CardFormat = 'story' | 'post';

/** Logical size of each format; captured at 1080 px wide. */
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 }, // 9:16 — stories, status
  post: { width: 360, height: 450 }, // 4:5 — feed posts
};

/** Padding that keeps content clear of Instagram's own story UI (top bar, reply box). */
export const SAFE: Record<CardFormat, { top: number; bottom: number; side: number }> = {
  story: { top: 58, bottom: 84, side: 28 },
  post: { top: 26, bottom: 24, side: 26 },
};

export const DISPLAY = 'Anton_400Regular';
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** FN mark + FIT/NYX wordmark. */
export function Wordmark({ color, accent, size = 17, shadow }: { color: string; accent: string; size?: number; shadow?: TextStyle }) {
  return (
    <View style={styles.brand}>
      <Image source={require('@/assets/images/fitnyx-logo.png')} style={{ width: size * 1.45, height: size * 1.45 }} />
      <Text style={[styles.wordmark, { color, fontSize: size }, shadow]}>
        FIT<Text style={{ color: accent }}>NYX</Text>
      </Text>
    </View>
  );
}

/** Small caps with wide tracking — every label on the cards. */
export function Label({ children, color, size = 9.5, style }: { children: React.ReactNode; color: string; size?: number; style?: TextStyle | TextStyle[] }) {
  return <Text style={[styles.label, { color, fontSize: size, letterSpacing: size * 0.22 }, style]}>{children}</Text>;
}

/** The hero number in Anton, with its unit riding the baseline. */
export function BigNumber({ stat, size, color, unitColor, shadow }: { stat: ShareStat; size: number; color: string; unitColor: string; shadow?: TextStyle }) {
  return (
    <Text style={[styles.big, { fontSize: size, lineHeight: size * 1.08, color }, shadow]} numberOfLines={1} adjustsFontSizeToFit>
      {stat.value}
      {stat.unit ? <Text style={{ fontSize: size * 0.3, color: unitColor }}> {stat.unit.toUpperCase()}</Text> : null}
    </Text>
  );
}

/** Up to three stats in columns with hairline dividers. */
export function StatRow({ stats, color, muted, rule, shadow }: { stats: ShareStat[]; color: string; muted: string; rule: string; shadow?: TextStyle }) {
  return (
    <View style={styles.stats}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: rule, paddingLeft: 14 }]}>
          <Text style={[styles.statValue, { color }, shadow]} numberOfLines={1} adjustsFontSizeToFit>
            {s.value}
            {s.unit ? <Text style={[styles.statUnit, { color: muted }]}> {s.unit}</Text> : null}
          </Text>
          <Label color={muted} size={8.5} style={shadow}>
            {s.label.toUpperCase()}
          </Label>
        </View>
      ))}
    </View>
  );
}

export function Pill({ text, color, bg, border }: { text: string; color: string; bg: string; border: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmark: { fontFamily: DISPLAY, letterSpacing: 0.8 },
  label: { fontFamily: type.weight.semibold },
  big: { fontFamily: DISPLAY, letterSpacing: -0.5, includeFontPadding: false },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, gap: 3 },
  statValue: { fontFamily: DISPLAY, fontSize: 25, lineHeight: 30, letterSpacing: 0.2, includeFontPadding: false },
  statUnit: { fontFamily: type.weight.semibold, fontSize: 11, letterSpacing: 0 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 11, paddingVertical: 5 },
  pillText: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 0.4 },
});
