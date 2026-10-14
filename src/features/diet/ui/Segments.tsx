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
            style={[styles.seg, on && [styles.on, { backgroundColor: c.card }]]}>
            <Text style={[styles.text, { color: on ? c.text : c.mutedText }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth },
  seg: { flex: 1, minHeight: 40, borderRadius: radii.md - 1, alignItems: 'center', justifyContent: 'center' },
  on: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  text: { fontFamily: type.weight.semibold, fontSize: 15 },
});
