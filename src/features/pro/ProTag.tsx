import { ProIcon } from '@/src/features/pro/ProIcon';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** The small "PRO" mark on a feature free users can't use yet. */
export function ProTag({ label = 'PRO' }: { label?: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.tag, { backgroundColor: c.accentSoft, borderColor: c.primary }]} accessibilityLabel="Pro feature">
      <ProIcon size={14} color={c.accent} />
      <Text style={[styles.text, { color: c.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontFamily: type.weight.bold, fontSize: 10.5, letterSpacing: 0.6 },
});
