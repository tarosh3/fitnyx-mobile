import { BotMessageSquare } from 'lucide-react-native';
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
      <BotMessageSquare size={size * 0.58} strokeWidth={1.8} color={inverted ? c.nav.coachInk : c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
