import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  label: string;
  value: string;
  unit?: string;
  delta?: { direction: 'up' | 'down' | 'neutral'; text: string };
  accent?: boolean;
}

export function StatTile({ label, value, unit, delta, accent }: Props) {
  const c = useThemeColors();
  const deltaColor =
    delta?.direction === 'up'
      ? c.success
      : delta?.direction === 'down'
        ? c.destructive
        : c.mutedText;

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: c.card, borderColor: c.border },
        accent && { borderColor: c.primary },
      ]}
    >
      <Text style={[styles.label, { color: c.mutedText }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: c.text }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: c.primary }]}>{unit}</Text> : null}
      </View>
      {delta ? (
        <Text style={[styles.delta, { color: deltaColor }]}>{delta.text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  label: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.xs,
    letterSpacing: type.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontFamily: type.weight.extrabold,
    fontSize: type.size.h2,
    letterSpacing: type.tracking.tight,
  },
  unit: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.xs,
    letterSpacing: type.tracking.wide,
    textTransform: 'uppercase',
  },
  delta: {
    fontFamily: type.weight.medium,
    fontSize: type.size.xs,
  },
});
