import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ProDoodle } from '@/src/features/pro/ProDoodle';
import { ProIcon } from '@/src/features/pro/ProIcon';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export function ProHero({ pro }: { pro: boolean }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const p = c.share.night;
  return (
    <View style={[styles.hero, { backgroundColor: p.bg, borderColor: p.faint }]} testID="pro-hero">
      <View style={styles.copy}>
        <View style={styles.topline}>
          <ProIcon size={20} color={p.accent} />
          <Text style={[styles.eyebrow, { color: p.accent }]}>{pro ? 'YOUR PRO MEMBERSHIP' : 'A LITTLE MORE POSSIBILITY'}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.headline, { color: p.text }, width < 360 && { fontSize: 32, lineHeight: 39 }]}>{pro ? 'MORE IN YOU.' : 'YOUR EFFORT.'}{'\n'}<Text style={{ color: p.accent }}>{pro ? 'ALL UNLOCKED.' : 'MEET YOUR EDGE.'}</Text></Text>
        <Text style={[styles.body, { color: p.muted }]}>{pro ? 'Your coach. Your training. Your next chapter.' : 'A coach in your corner. Training that adapts.\nMore ways to move forward.'}</Text>
      </View>
      <View style={styles.art} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ProDoodle /></View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: { borderRadius: radii['2xl'], overflow: 'hidden', borderWidth: 1 },
  copy: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  topline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.5, lineHeight: 16, flexShrink: 1 },
  headline: { ...type.display, fontSize: 40, lineHeight: 47, letterSpacing: -0.5, marginTop: spacing.base },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 20, marginTop: spacing.md },
  art: { height: 180, marginTop: spacing.sm, marginBottom: spacing.base },
});
