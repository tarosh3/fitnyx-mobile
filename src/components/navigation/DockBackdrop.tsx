import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { type RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';

/**
 * A light blur, built up in layers so it has no hard top line: heights are a share of
 * the backdrop, intensities add up. Android's blur is costlier and takes a blur target,
 * so it gets the one layer.
 */
const LAYERS = Platform.OS === 'ios'
  ? [{ height: '100%', intensity: 4 }, { height: '70%', intensity: 6 }, { height: '40%', intensity: 8 }] as const
  : [{ height: '100%', intensity: 18 }] as const;

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
          intensity={layer.intensity} blurReductionFactor={4} blurMethod="dimezisBlurViewSdk31Plus"
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
