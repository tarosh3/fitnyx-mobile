import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** A badge disc: earned = green ring, locked = muted. */
export function Medal({ mark, earned, size = 64 }: { mark: string; earned: boolean; size?: number }) {
  const c = useThemeColors();
  return (
    <View style={[styles.disc, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: earned ? c.accentSoft : c.surface,
      borderColor: earned ? c.accent : c.border,
    }]}>
      <Text allowFontScaling={false} style={[styles.mark, { fontSize: size * 0.3, color: earned ? c.accent : c.mutedText }]}>{mark}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mark: { ...type.display },
});
