import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { type RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';

/**
 * A light blur with no hard top line, built up in layers: heights are a share of the
 * backdrop. iOS layers add up. Android's each replace what's below them, so it ramps the
 * radius in small steps instead. Its tint strength follows intensity, so intensity stays
 * low and the factor at 1 gives the radius: at intensity 18, the tint alone drew a lighter
 * band with a visible edge across the screen (reported 2026-11-06).
 */
const LAYERS = Platform.OS === 'ios'
  ? [{ height: '100%', intensity: 4 }, { height: '70%', intensity: 6 }, { height: '40%', intensity: 8 }] as const
  : [{ height: '100%', intensity: 2 }, { height: '80%', intensity: 4 }, { height: '60%', intensity: 6 }, { height: '40%', intensity: 8 }, { height: '20%', intensity: 10 }] as const;
const REDUCTION = Platform.OS === 'ios' ? 4 : 1;

/**
 * Under the dock: page content scrolled below the pill is softened rather than sharp.
 * It stops just behind the pill, so nothing above the dock is touched. Reduce
 * Transparency gets the colour wash alone.
 */
export function DockBackdrop({ height, blurTarget, reduceTransparency }: {
  height: number; blurTarget?: RefObject<View | null>; reduceTransparency: boolean;
}) {
  const c = useThemeColors();
  const { theme } = useTheme();
  const clear = `${c.background}00`;
  return (
    <View testID="dock-backdrop" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { height }]}>
      {!reduceTransparency ? LAYERS.map((layer) => (
        <BlurView key={layer.height} pointerEvents="none" style={[styles.layer, { height: layer.height }]}
          tint={theme === 'light' ? 'systemUltraThinMaterialLight' : 'systemUltraThinMaterialDark'}
          intensity={layer.intensity} blurReductionFactor={REDUCTION} blurMethod="dimezisBlurViewSdk31Plus"
          blurTarget={blurTarget ?? undefined} />
      )) : null}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
        colors={[clear, reduceTransparency ? c.background : `${c.background}99`]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
