import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, type } from '@/src/styles/tokens';

/** Segmented control ("Today · Insights", "Recent · Frequent"). */
export function Segments({ options, selected, onSelect }: { options: string[]; selected: number; onSelect: (index: number) => void }) {
  const c = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="tablist">
      {options.map((o, i) => {
        const on = i === selected;
        return (
          <Pressable key={o} onPress={() => onSelect(i)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[styles.seg, on && [styles.on, { backgroundColor: c.accentSoft }]]}>
            <Text style={[styles.text, { color: on ? c.accent : c.mutedText }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth },
  seg: { flex: 1, minHeight: 44, borderRadius: radii.md - 1, alignItems: 'center', justifyContent: 'center' },
  on: {},
  text: { fontFamily: type.weight.semibold, fontSize: 15 },
});
