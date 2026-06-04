import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

interface Props {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, subtitle, trailing }: Props) {
  const c = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>{eyebrow}</Text>
        ) : null}
        {title ? <Text style={[styles.title, { color: c.text }]}>{title}</Text> : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.mutedText }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.xs,
    letterSpacing: type.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: type.weight.bold,
    fontSize: type.size.h2,
    letterSpacing: type.tracking.tight,
  },
  subtitle: {
    fontFamily: type.weight.regular,
    fontSize: type.size.sm,
  },
});
