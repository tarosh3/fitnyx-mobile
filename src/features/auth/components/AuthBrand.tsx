import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { type } from '@/src/styles/tokens';
import { colors } from '@/src/theme/colors';

export function AuthBrand() {
  return (
    <Text accessibilityLabel="FitNyx" style={styles.wordmark}>
      FIT<Text style={styles.accent}>NYX</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: type.display.fontFamily,
    fontSize: 25,
    lineHeight: 34,
    letterSpacing: 1.2,
    color: colors.dark.text,
  },
  accent: { color: colors.dark.primary },
});
