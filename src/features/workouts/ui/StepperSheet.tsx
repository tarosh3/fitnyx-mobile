import { Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { limitDecimals, WEIGHT_DECIMALS } from '@/src/lib/decimal';
import { haptic } from '@/src/lib/haptics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export interface StepField {
  key: string;
  label: string;
  hint?: string;
  value: number;
  step: number;
  min: number;
  max: number;
  /** Shown in the box (e.g. seconds → "0:45"). Typing still edits the raw number. */
  display?: (v: number) => string;
  /** Most decimals the box accepts when typing (weights: 2, the backend's precision). */
  decimals?: number;
}

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  fields: StepField[];
  saveLabel?: string;
  onSave: (values: Record<string, number>) => void;
  onClose: () => void;
  /** Extra controls under the steppers (effort, plate calculator…). */
  children?: React.ReactNode;
  secondary?: React.ReactNode;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Big −/+ steppers with a keypad fallback — easier than typing for everyone. */
export function StepperSheet({ visible, title, subtitle, fields, saveLabel = 'Done', onSave, onClose, children, secondary }: Props) {
  const c = useThemeColors();
  const [values, setValues] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    const v: Record<string, number> = {};
    const t: Record<string, string> = {};
    fields.forEach((f) => { v[f.key] = f.value; t[f.key] = String(round(f.value)); });
    setValues(v);
    setTexts(t);
  }, [visible]);

  const set = (f: StepField, next: number) => {
    const clamped = Math.min(f.max, Math.max(f.min, round(next)));
    setValues((p) => ({ ...p, [f.key]: clamped }));
    setTexts((p) => ({ ...p, [f.key]: String(clamped) }));
  };

  return (
    <Sheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}
      footer={<><Button testID="stepper-save" title={saveLabel} onPress={() => onSave(values)} />{secondary}</>}>
      <View style={styles.fields}>
        {fields.map((f) => {
          const v = values[f.key] ?? f.value;
          return (
            <View key={f.key} style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: c.text }]}>{f.label}</Text>
                {f.hint ? <Text style={[styles.hint, { color: c.mutedText }]}>{f.hint}</Text> : null}
              </View>
              <View style={styles.row}>
                <Pressable onPress={() => { haptic.light(); set(f, v - f.step); }} accessibilityRole="button" accessibilityLabel={`Less ${f.label}`}
                  style={({ pressed }) => [styles.step, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}>
                  <Minus size={28} color={c.text} />
                </Pressable>
                <View style={[styles.valueBox, { borderColor: c.border, backgroundColor: c.background }]}>
                  <TextInput
                    value={f.display && texts[f.key] === String(round(v)) ? f.display(v) : texts[f.key] ?? ''}
                    onChangeText={(raw) => {
                      const t = f.decimals === undefined ? raw : limitDecimals(raw, f.decimals);
                      setTexts((p) => ({ ...p, [f.key]: t }));
                      const n = parseFloat(t.replace(',', '.'));
                      if (!Number.isNaN(n)) setValues((p) => ({ ...p, [f.key]: Math.min(f.max, Math.max(f.min, n)) }));
                    }}
                    onFocus={() => setTexts((p) => ({ ...p, [f.key]: String(round(v)) }))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    accessibilityLabel={`${f.label}${f.hint ? ` in ${f.hint}` : ''}`}
                    style={[styles.value, { color: c.text }]}
                  />
                </View>
                <Pressable onPress={() => { haptic.light(); set(f, v + f.step); }} accessibilityRole="button" accessibilityLabel={`More ${f.label}`}
                  style={({ pressed }) => [styles.step, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}>
                  <Plus size={28} color={c.text} />
                </Pressable>
              </View>
            </View>
          );
        })}
        {children}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg, paddingBottom: spacing.sm },
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: type.weight.bold, fontSize: 16 },
  hint: { fontFamily: type.weight.regular, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  step: { width: 64, height: 64, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
  valueBox: { flex: 1, height: 64, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  value: { fontFamily: type.weight.extrabold, fontSize: 30, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export const stepFieldsFor = {
  sets: (v: number): StepField => ({ key: 'sets', label: 'Sets', value: v, step: 1, min: 1, max: 10 }),
  reps: (v: number): StepField => ({ key: 'reps', label: 'Reps', value: v, step: 1, min: 0, max: 200 }),
  kg: (v: number, label = 'Weight'): StepField => ({ key: 'kg', label, hint: 'kg', value: v, step: 2.5, min: 0, max: 500, decimals: WEIGHT_DECIMALS }),
  addKg: (v: number): StepField => ({ key: 'kg', label: 'Extra weight', hint: '0 = bodyweight', value: v, step: 2.5, min: 0, max: 200, decimals: WEIGHT_DECIMALS }),
  holdSec: (v: number): StepField => ({ key: 'sec', label: 'Hold time', hint: 'seconds', value: v, step: 15, min: 5, max: 900 }),
  minutes: (v: number): StepField => ({ key: 'min', label: 'Time', hint: 'minutes', value: v, step: 1, min: 1, max: 300 }),
  km: (v: number): StepField => ({ key: 'km', label: 'Distance', hint: 'km', value: v, step: 0.1, min: 0, max: 200 }),
};
