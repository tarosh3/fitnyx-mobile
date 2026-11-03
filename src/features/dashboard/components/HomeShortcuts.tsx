import { ContourArt } from '@/src/components/art/ContourArt';
import { useRouter } from 'expo-router';
import { ArrowRight, Droplets } from 'lucide-react-native';
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

/**
 * Home's first block: the only ways into Roam and Nutrition, so they sit at the
 * top as two tiles, each with one line on what it does and a clear action.
 * Large text or a narrow screen stacks them.
 */
export function HomeEntryTiles() {
  const c = useThemeColors();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.3 || width < 340;
  return (
    <View testID="home-essentials" style={[styles.tiles, stacked && styles.tilesStacked]}>
      <HomePressable testID="home-roam" accessibilityRole="button" accessibilityLabel="Roam: track a run, walk or ride. Start a Roam"
        onPress={() => router.push('/roam')} style={[styles.tile, { backgroundColor: c.card }]}>
        <View pointerEvents="none" style={styles.tileArt}><TrailArtwork /></View>
        <Text style={[styles.tileTitle, { color: c.text }]}>Roam</Text>
        <Text style={[styles.tileText, { color: c.mutedText }]}>Track a run, walk or ride on a map.</Text>
        <View style={styles.action}><Text style={[styles.actionText, { color: c.accent }]}>Start a Roam</Text><ArrowRight size={16} color={c.accent} /></View>
      </HomePressable>
      <HomePressable testID="home-nutrition" accessibilityRole="button" accessibilityLabel="Nutrition: your meal plan, macros and food log. Log meals"
        onPress={() => router.push('/diet')} style={[styles.tile, { backgroundColor: c.card }]}>
        <View pointerEvents="none" style={styles.tileArt}><ContourArt subject="nutrition" width="100%" height={56} /></View>
        <Text style={[styles.tileTitle, { color: c.text }]}>Nutrition</Text>
        <Text style={[styles.tileText, { color: c.mutedText }]}>Your meal plan, macros and food log.</Text>
        <View style={styles.action}><Text style={[styles.actionText, { color: c.accent }]}>Log meals</Text><ArrowRight size={16} color={c.accent} /></View>
      </HomePressable>
    </View>
  );
}

/** Today's plan targets (eat · burn · train) and the water row. */
export function HomeShortcuts({ children }: { children?: React.ReactNode }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={styles.group}>
      {children}
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
  tiles: { flexDirection: 'row', gap: spacing.md },
  tilesStacked: { flexDirection: 'column' },
  tile: { flex: 1, minHeight: 188, borderRadius: radii['2xl'], padding: spacing.base, gap: spacing.xs },
  tileArt: { width: 72, height: 56, marginBottom: spacing.sm },
  tileTitle: { fontFamily: type.weight.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  tileText: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  // Pinned to the tile's bottom so both actions line up whatever the copy wraps to.
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: spacing.sm, minHeight: 32 },
  actionText: { flexShrink: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
  group: { gap: spacing.md },
  water: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs, minHeight: 52, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  waterCopy: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: 2 },
  waterTitle: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 19 },
  waterSubtitle: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
});
