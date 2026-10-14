import { LinearGradient } from 'expo-linear-gradient';
import { Check, Zap } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  recovered?: boolean;
  children: React.ReactNode;
}

/** Editorial training artwork stays decorative; the action and session state remain native. */
export function TrainingHeroCard({ eyebrow, title, subtitle, recovered, children }: Props) {
  const c = useThemeColors();
  const Icon = recovered ? Check : Zap;
  return (
    <View style={[styles.card, { backgroundColor: c.hero.to, borderColor: c.hero.line }]}>
      <Image source={require('../../../../assets/images/workouts/training-hero.jpg')}
        style={[StyleSheet.absoluteFill, styles.image]} resizeMode="cover" accessible={false} />
      <LinearGradient colors={[`${c.hero.to}B8`, `${c.hero.to}00`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={[`${c.hero.to}00`, `${c.hero.to}B8`, c.hero.to]} locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[styles.badge, { backgroundColor: `${c.hero.to}C9`, borderColor: c.hero.line }]}>
        <Icon size={13} color={c.hero.accent} strokeWidth={2.5} />
        <Text style={[styles.eyebrow, { color: c.hero.accent }]}>{eyebrow}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: c.hero.text }]} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.hero.muted }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: spacing.lg, minHeight: 324 },
  image: { width: undefined, height: undefined },
  badge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', gap: 6, alignItems: 'center' },
  eyebrow: { flexShrink: 1, fontFamily: type.weight.bold, fontSize: 10, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  copy: { paddingTop: 66, gap: spacing.sm, paddingBottom: spacing.base },
  title: { fontFamily: type.weight.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -1, maxWidth: '90%' },
  subtitle: { fontFamily: type.weight.medium, fontSize: 14, lineHeight: 20, maxWidth: '90%' },
  actions: { gap: spacing.sm, marginTop: 'auto' },
});
