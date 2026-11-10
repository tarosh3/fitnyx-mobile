import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProDoodle } from '@/src/features/pro/ProDoodle';
import { ProIcon } from '@/src/features/pro/ProIcon';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** A bespoke vector training sketch and Pro identity, shared across app themes. */
export function ProHero({ pro }: { pro: boolean }) {
  const c = useThemeColors();
  return (
    <View style={[styles.hero, { backgroundColor: c.share.night.bg }]} testID="pro-hero">
      <View style={styles.topline}>
        <View style={[styles.badge, { backgroundColor: c.hero.accent }]}>
          <ProIcon size={17} color={c.share.night.ink} />
          <Text style={[styles.badgeText, { color: c.share.night.ink }]}>FITNYX PRO</Text>
        </View>
      </View>
      <View style={styles.art} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ProDoodle />
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.headline, { color: c.hero.text }]}>
          {pro ? 'MORE IN YOU.' : 'YOUR EFFORT.'}{'\n'}
          <Text style={{ color: c.hero.accent }}>{pro ? 'ALL UNLOCKED.' : 'SUPERCHARGED.'}</Text>
        </Text>
        <Text style={[styles.body, { color: c.share.night.muted }]}>
          {pro ? 'Your goals. Your coach. Your next level.' : 'A coach that knows you. A plan that grows with you.'}
        </Text>
        <View style={[styles.signature, { borderColor: c.share.night.faint }]}>
          <Text style={[styles.signatureText, { color: c.hero.text }]}>TRAIN SMARTER</Text>
          <View style={[styles.dot, { backgroundColor: c.hero.accent }]} />
          <Text style={[styles.signatureText, { color: c.hero.text }]}>GO FURTHER</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii['2xl'], overflow: 'hidden' },
  art: { height: 210, marginHorizontal: spacing.sm },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  badgeText: { fontFamily: type.weight.extrabold, fontSize: 11, letterSpacing: 1.8 },
  copy: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, marginTop: spacing.sm },
  headline: { ...type.display, fontSize: 39, lineHeight: 46, letterSpacing: -0.5 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.md, maxWidth: 280 },
  signature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.base, marginTop: spacing.lg },
  signatureText: { fontFamily: type.weight.semibold, fontSize: 10, letterSpacing: 1.7 },
  dot: { width: 4, height: 4, borderRadius: radii.pill },
});
