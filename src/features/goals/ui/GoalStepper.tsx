import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  color: string;
  /** null = goal off. */
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min: number;
  max: number;
  presets: number[];
  /** Value when switched on. */
  initial: number;
  format: (v: number) => string;
  /** Quick-pick labels (default: format); shorter keeps them on one line. */
  formatPreset?: (v: number) => string;
  /** Hide the on/off switch (the goal is always set). */
  required?: boolean;
}

/** A goal you can switch on, nudge with −/+ or pick from quick values. */
export function GoalStepper({ label, hint, icon, color, value, onChange, step, min, max, presets, initial, format, formatPreset = format, required }: Props) {
  const c = useThemeColors();
  const on = value != null;
  const nudge = (d: number) => {
    haptic.light();
    onChange(Math.min(max, Math.max(min, (value ?? initial) + d)));
  };
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: on ? color : c.border }]}>
      <View style={styles.head}>
        {icon}
        <View style={styles.titles}>
          <Text style={[styles.label, { color: c.text }]}>{label}</Text>
          {hint ? <Text style={[styles.hint, { color: c.mutedText }]}>{hint}</Text> : null}
        </View>
        {required ? null : (
          <Switch value={on} onValueChange={(next) => { haptic.selection(); onChange(next ? initial : null); }}
            accessibilityLabel={`${label} goal`} trackColor={{ true: color, false: c.border }} thumbColor={c.surface} />
        )}
      </View>
      {on ? (
        <>
          <View style={styles.row}>
            <Pressable onPress={() => nudge(-step)} accessibilityRole="button" accessibilityLabel={`Less ${label}`}
              style={({ pressed }) => [styles.step, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}>
              <Minus size={22} color={c.text} />
            </Pressable>
            <Text style={[styles.value, { color: c.text }]} accessibilityLiveRegion="polite">{format(value)}</Text>
            <Pressable onPress={() => nudge(step)} accessibilityRole="button" accessibilityLabel={`More ${label}`}
              style={({ pressed }) => [styles.step, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}>
              <Plus size={22} color={c.text} />
            </Pressable>
          </View>
          <View style={styles.presets}>
            {presets.map((p) => {
              const picked = p === value;
              return (
                <Pressable key={p} onPress={() => { haptic.selection(); onChange(p); }} accessibilityRole="button"
                  accessibilityState={{ selected: picked }} accessibilityLabel={`${label} ${format(p)}`}
                  style={[styles.preset, { borderColor: picked ? color : c.border, backgroundColor: picked ? c.accentSoft : 'transparent' }]}>
                  <Text style={[styles.presetText, { color: picked ? c.text : c.mutedText }]}>{formatPreset(p)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1 },
  label: { fontFamily: type.weight.bold, fontSize: 16 },
  hint: { fontFamily: type.weight.regular, fontSize: 13, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { width: 52, height: 52, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
  value: { flex: 1, textAlign: 'center', fontFamily: type.weight.extrabold, fontSize: 26, fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 7, minHeight: 36, justifyContent: 'center' },
  presetText: { fontFamily: type.weight.semibold, fontSize: 13 },
});
