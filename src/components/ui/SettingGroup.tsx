import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing } from '@/src/styles/tokens';

interface Props {
  children: React.ReactNode;
}

/**
 * Groups SettingRows in a single rounded card with separators between them.
 */
export function SettingGroup({ children }: Props) {
  const c = useThemeColors();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {items.map((child, idx) => (
        <View key={idx}>
          {child}
          {idx < items.length - 1 ? (
            <View style={[styles.separator, { backgroundColor: c.border }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.base + 36 + spacing.md, // align past icon
  },
});
