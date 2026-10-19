import { CalendarRange } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, type } from '@/src/styles/tokens';
import { granOptions, PRESETS, type Gran, type RangeChoice } from '../range';
import { Chip } from './bits';

const GRANS: { key: Gran; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

/** Preset chips + Custom. One range drives every Progress view. */
export function RangeChips({ choice, onPreset, onCustom }: { choice: RangeChoice; onPreset: (key: RangeChoice) => void; onCustom: () => void }) {
  const c = useThemeColors();
  const custom = 'custom' in choice;
  return (
    <View style={styles.row}>
      {PRESETS.map((p) => (
        <Chip key={p.key} testID={`range-${p.key}`} label={p.label} active={!custom && choice.preset === p.key} onPress={() => onPreset({ preset: p.key })} />
      ))}
      <Chip testID="range-custom" label="Custom" active={custom} onPress={onCustom}
        icon={<CalendarRange size={15} color={custom ? c.accent : c.text} strokeWidth={2} />} />
    </View>
  );
}

/** Day / Week / Month; options that would make an unreadable chart are disabled. */
export function GranSwitch({ value, span, onChange }: { value: Gran; span: number; onChange: (g: Gran) => void }) {
  const c = useThemeColors();
  const ok = granOptions(span);
  return (
    <View style={[styles.switch, { backgroundColor: c.background, borderColor: c.border }]} accessibilityRole="tablist">
      {GRANS.map((g) => {
        const on = value === g.key;
        return (
          <Pressable key={g.key} testID={`gran-${g.key}`} disabled={!ok[g.key]} onPress={() => onChange(g.key)}
            accessibilityRole="tab" accessibilityState={{ selected: on, disabled: !ok[g.key] }}
            accessibilityLabel={`Group by ${g.label.toLowerCase()}`}
            style={[styles.seg, on && { backgroundColor: c.card }]}>
            <Text style={[styles.segText, { color: on ? c.text : ok[g.key] ? c.mutedText : c.border }]}>{g.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switch: { flexDirection: 'row', padding: 3, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  seg: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: type.weight.bold, fontSize: 12 },
});
