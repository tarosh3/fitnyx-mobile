import { ContourArt } from '@/src/components/art/ContourArt';
import { Check, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
      <View pointerEvents="none" style={{ position: 'absolute', top: 18, right: 0 }}><ContourArt subject="training" width={172} height={126} color={c.hero.accent} /></View>
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
  eyebrow: { flexShrink: 1, fontFamily: type.weight.bold, fontSize: type.size.micro, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  copy: { paddingTop: 80, gap: spacing.sm, paddingBottom: spacing.base },
  title: { fontFamily: type.weight.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -1, maxWidth: '90%' },
  subtitle: { fontFamily: type.weight.medium, fontSize: 14, lineHeight: 20, maxWidth: '90%' },
  actions: { gap: spacing.sm, marginTop: 'auto' },
});
