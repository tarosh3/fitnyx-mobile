import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { RouteMapProps } from '@/src/features/roam/components/RouteMap';

// MapLibre is native-only; the web build (CI export) shows a placeholder.
export function RouteMap({ style }: RouteMapProps) {
  const palette = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.border }, style]}>
      <Text style={{ color: palette.mutedText }}>Route maps are available in the FitNyx app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', borderRadius: 16, borderWidth: 1, justifyContent: 'center', minHeight: 160 },
});
