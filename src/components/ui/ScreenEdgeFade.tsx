import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Opaque at the screen edge, fading only where content meets the chrome. */
export function ScreenEdgeFade({ edge, inset, fade = 24 }: { edge: 'top' | 'bottom'; inset: number; fade?: number }) {
  const c = useThemeColors();
  // Theme backgrounds are hex; retain the same RGB at the transparent stop.
  const clear = `${c.background}00`;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { [edge]: 0, height: inset + fade }]}>
      <View style={{ position: 'absolute', left: 0, right: 0, [edge]: 0, height: inset, backgroundColor: c.background }} />
      <LinearGradient colors={edge === 'top' ? [c.background, clear] : [clear, c.background]}
        style={{ position: 'absolute', left: 0, right: 0, [edge]: inset, height: fade }} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0 } });
