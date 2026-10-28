import { FiloGlyph } from '@/src/components/art/FiloGlyph';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

/** The same coach signature in the dock, chat header, and conversation. */
export function FiloMark({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const c = useThemeColors();
  return (
    <View accessible={false} style={[styles.mark, {
      width: size, height: size, borderRadius: size * 0.32,
      backgroundColor: inverted ? c.nav.coachLens : c.accentSoft,
    }]}>
      <FiloGlyph size={size * 0.82} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
