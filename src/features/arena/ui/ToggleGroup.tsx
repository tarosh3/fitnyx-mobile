import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** A compact pill toggle (one track, one selected pill) for the Arena's filters. */
export function ToggleGroup<T extends string>({ options, value, onChange, testID }: {
  options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; testID?: string;
}) {
  const c = useThemeColors();
  return (
    <View style={[styles.track, { backgroundColor: c.card, borderColor: c.border }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} testID={testID ? `${testID}-${o.value}` : undefined} onPress={() => onChange(o.value)}
            accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={4}
            style={[styles.pill, on && { backgroundColor: c.text }]}>
            <Text style={[styles.label, { color: on ? c.background : c.mutedText }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, padding: 3 },
  pill: { paddingHorizontal: spacing.md, minHeight: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: type.weight.semibold, fontSize: 13 },
});
