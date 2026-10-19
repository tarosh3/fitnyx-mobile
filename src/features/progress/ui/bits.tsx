import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export function Eyebrow({ children, color, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const c = useThemeColors();
  return <Text style={[styles.eyebrow, { color: color ?? c.mutedText }, style]}>{children}</Text>;
}

/** A big display number (Anton) with an optional small unit after it. */
export function BigNumber({ value, unit, size = 48, color }: { value: string; unit?: string; size?: number; color?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.bigRow}>
      <Text style={[styles.big, { fontSize: size, lineHeight: size * 1.1, color: color ?? c.text }]} maxFontSizeMultiplier={1.2}>{value}</Text>
      {unit ? <Text style={[styles.unit, { color: c.mutedText }]}>{unit}</Text> : null}
    </View>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useThemeColors();
  return <Text style={[styles.muted, { color: c.mutedText }, style]}>{children}</Text>;
}

/** "+12% vs the 30 days before" — green when up, warning when down. */
export function Change({ pct, suffix }: { pct: number | null; suffix: string }) {
  const c = useThemeColors();
  if (pct === null) return <Muted>No earlier data to compare</Muted>;
  return (
    <Text style={[styles.muted, { color: c.mutedText }]}>
      <Text style={{ color: pct >= 0 ? c.accent : c.warning, fontFamily: type.weight.bold }}>{pct >= 0 ? '+' : '−'}{Math.abs(pct)}%</Text> {suffix}
    </Text>
  );
}

export function CardTitle({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  const c = useThemeColors();
  return (
    <View style={styles.titleRow}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {right ? (
        onRight ? (
          <Pressable onPress={onRight} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.link, { color: c.accent }]}>{right}</Text>
          </Pressable>
        ) : <Muted>{right}</Muted>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, testID }: { label: string; active: boolean; onPress: () => void; icon?: React.ReactNode; testID?: string }) {
  const c = useThemeColors();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? c.accentSoft : c.card, borderColor: active ? c.accent : c.border }]}>
      {icon}
      <Text style={[styles.chipText, { color: active ? c.accent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function Empty({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const c = useThemeColors();
  return (
    <View style={[styles.empty, { borderColor: c.border }, style]}>
      <Text style={[styles.muted, { color: c.mutedText, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: type.weight.bold, fontSize: 11, letterSpacing: type.tracking.eyebrow, textTransform: 'uppercase' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { ...type.display },
  unit: { fontFamily: type.weight.bold, fontSize: 15 },
  muted: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  link: { fontFamily: type.weight.semibold, fontSize: 13 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: type.weight.bold, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center' },
});
