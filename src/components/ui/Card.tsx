import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

export function Card({ style, ...props }: ViewProps) {
  const palette = useThemeColors();

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
});
