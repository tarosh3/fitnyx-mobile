import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Barbell-plate motif drawn behind hero cards. */
export function PlatesDeco({ color, size = 240, style }: { color: string; size?: number; style?: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" style={[styles.deco, style]} pointerEvents="none">
      {[104, 82, 60, 16].map((r) => <Circle key={r} cx={110} cy={110} r={r} stroke={color} strokeWidth={2} fill="none" />)}
      <Line x1={0} y1={110} x2={220} y2={110} stroke={color} strokeWidth={6} />
    </Svg>
  );
}

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  center?: boolean;
  testID?: string;
}

/** Deep-green card for the one thing to do next. */
export function Hero({ eyebrow, title, subtitle, children, center, testID }: Props) {
  const c = useThemeColors();
  return (
    <LinearGradient testID={testID} colors={[c.hero.from, c.hero.to]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[styles.hero, center && styles.center]}>
      <PlatesDeco color={c.hero.line} />
      <Text style={[styles.eyebrow, { color: c.hero.accent }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: c.hero.text }, center && styles.textCenter]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: c.hero.muted }, center && styles.textCenter]}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: spacing.lg, paddingTop: 22, gap: spacing.md, overflow: 'hidden' },
  center: { alignItems: 'center' },
  deco: { position: 'absolute', right: -70, top: -64 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: type.weight.extrabold, fontSize: 30, letterSpacing: -0.6, lineHeight: 34 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 15, marginTop: -4 },
  textCenter: { textAlign: 'center' },
});

export const heroButton = StyleSheet.create({
  primary: { minHeight: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  quiet: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
