import { ContourArt } from '@/src/components/art/ContourArt';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowUpRight, Droplets } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { HomePressable } from './HomePressable';

/** Original contour illustration: a symbolic trail, never presented as recorded GPS data. */
function TrailArtwork() {
  const c = useThemeColors();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 190 158" accessible={false}>
      <G fill="none" stroke={c.accent} opacity={0.22} strokeWidth="0.8">
        <Path d="M16 155C-3 116 24 85 60 90S102 91 93 57 114 4 164-5M30 161C8 125 32 103 60 105S122 106 110 60 138 15 184 7M48 168C24 140 37 118 67 120S137 120 127 73 142 33 198 20M64 177C44 147 56 133 83 138S151 124 146 86 154 50 202 41M-3 132C-8 89 17 65 50 72S84 68 76 37 117-10 139-12M-12 100C12 36 54 74 58 33S99-14 116-15M85 167C103 146 154 158 163 118S164 68 204 61" />
      </G>
      <Path d="M37 127C53 133 65 125 66 111S51 83 65 77 105 94 117 72 106 51 117 37 145 29 150 17" fill="none" stroke={c.accentSoft} strokeWidth="10" strokeLinecap="round" />
      <Path d="M37 127C53 133 65 125 66 111S51 83 65 77 105 94 117 72 106 51 117 37 145 29 150 17" fill="none" stroke={c.accent} strokeWidth="3.5" strokeLinecap="round" />
      <Circle cx="37" cy="127" r="6" fill={c.accentSoft} stroke={c.accent} strokeWidth="3" />
      <Circle cx="150" cy="17" r="8" fill={c.accent} />
      <Circle cx="150" cy="17" r="3" fill={c.accentSoft} />
    </Svg>
  );
}

export function HomeShortcuts({ children }: { children?: React.ReactNode }) {
  const c = useThemeColors();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.2;
  const compact = width < 360;
  return (
    <View testID="home-essentials" style={styles.group}>
      <HomePressable testID="home-roam" accessibilityRole="button" accessibilityLabel="Open Roam: walk, run or cycle"
        onPress={() => router.push('/roam')} style={[styles.feature, styles.roamFeature, { backgroundColor: c.accentSoft }]}>
        <View style={styles.featureCopy}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>ROAM</Text>
          <Text style={[styles.featureTitle, compact && styles.compactTitle, { color: c.text }]}>Find your{ '\n' }own pace.</Text>
          <Text style={[styles.description, { color: c.mutedText }]}>Walk, run or ride.</Text>
          <View style={styles.action}><Text style={[styles.actionText, { color: c.accent }]}>Open ROAM</Text><ArrowUpRight size={17} color={c.accent} /></View>
        </View>
        <View pointerEvents="none" style={[styles.artwork, largeText && styles.smallArtwork]}><TrailArtwork /></View>
      </HomePressable>

      <View style={styles.nutritionSection}>
        <HomePressable testID="home-nutrition" accessibilityRole="button" accessibilityLabel="Open Nutrition: plan and log your meals"
          onPress={() => router.push('/diet')} style={[styles.feature, styles.nutritionFeature]}>
          <View pointerEvents="none" style={[styles.foodArtwork, compact && styles.compactFoodArtwork, largeText && styles.smallArtwork]}><ContourArt subject="nutrition" width="100%" height={largeText ? 100 : 148} /></View>
          <View style={[styles.featureCopy, styles.nutritionCopy]}>
            <Text style={[styles.eyebrow, { color: c.accent }]}>NUTRITION</Text>
            <Text style={[styles.featureTitle, compact && styles.compactTitle, { color: c.text }]}>Eat well.{ '\n' }Feel your best.</Text>
            <Text style={[styles.description, { color: c.mutedText }]}>Meals, macros & daily fuel.</Text>
            <View style={styles.action}><Text style={[styles.actionText, { color: c.accent }]}>Plan & log meals</Text><ArrowUpRight size={17} color={c.accent} /></View>
          </View>
        </HomePressable>

        {children}
      </View>

      <HomePressable testID="home-water" accessibilityRole="button" accessibilityLabel="Open Water: stay hydrated"
        onPress={() => router.push('/water')} style={[styles.water, { borderTopColor: c.border }]}>
        <Droplets size={21} strokeWidth={1.7} color={c.diet.water} />
        <View style={styles.waterCopy}><Text style={[styles.waterTitle, { color: c.text }]}>Stay hydrated</Text><Text style={[styles.waterSubtitle, { color: c.mutedText }]}>Log your water</Text></View>
        <ArrowRight size={18} color={c.mutedText} />
      </HomePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
  feature: { flexDirection: 'row', alignItems: 'center' },
  roamFeature: { borderRadius: radii['2xl'], overflow: 'hidden', minHeight: 184 },
  nutritionSection: { paddingTop: spacing.sm },
  nutritionFeature: { minHeight: 148 },
  featureCopy: { flex: 1, paddingVertical: spacing.base, paddingLeft: spacing.lg, gap: 5 },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.micro, lineHeight: 15, letterSpacing: 1.5 },
  featureTitle: { fontFamily: type.weight.bold, fontSize: 25, lineHeight: 28, letterSpacing: -0.8 },
  compactTitle: { fontSize: 22, lineHeight: 26 },
  description: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  actionText: { flexShrink: 1, fontFamily: type.weight.semibold, fontSize: 12, lineHeight: 18 },
  artwork: { width: '41%', height: 144 },
  nutritionCopy: { paddingLeft: spacing.md, paddingRight: spacing.xs },
  foodArtwork: { width: '43%', height: 158, marginLeft: -spacing.sm },
  compactFoodArtwork: { width: '35%', height: 136 },
  smallArtwork: { width: '26%', height: 100 },
  water: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs, minHeight: 52, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  waterCopy: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: 2 },
  waterTitle: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 19 },
  waterSubtitle: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
});
