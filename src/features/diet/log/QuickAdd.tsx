import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const MAX_KCAL = 5000;

/** For food that isn't in the list: just calories (and protein if known). */
export function QuickAdd({ onAdd }: { onAdd: (name: string, kcal: number, protein: number) => void }) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const k = Number(kcal), p = protein ? Number(protein) : 0;
  const valid = Number.isFinite(k) && k > 0 && k <= MAX_KCAL && Number.isFinite(p) && p >= 0 && p * 4 <= k + 1;

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button"
        style={({ pressed }) => [styles.open, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        <Text style={[styles.openText, { color: c.text }]}>Can’t find it? Quick-add calories</Text>
      </Pressable>
    );
  }
  const input = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }];
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>Quick add</Text>
      <TextInput value={name} onChangeText={setName} placeholder="What was it? (optional)" placeholderTextColor={c.mutedText}
        accessibilityLabel="Food name" maxLength={80} style={input} />
      <View style={styles.row}>
        <TextInput value={kcal} onChangeText={(t) => setKcal(t.replace(/[^0-9]/g, ''))} placeholder="kcal" placeholderTextColor={c.mutedText}
          accessibilityLabel="Calories" keyboardType="number-pad" maxLength={4} style={[input, styles.grow]} />
        <TextInput value={protein} onChangeText={(t) => setProtein(t.replace(/[^0-9]/g, ''))} placeholder="Protein g (optional)" placeholderTextColor={c.mutedText}
          accessibilityLabel="Protein in grams" keyboardType="number-pad" maxLength={3} style={[input, styles.grow]} />
      </View>
      <Pressable onPress={() => valid && onAdd(name.trim() || 'Quick add', k, p)} disabled={!valid} accessibilityRole="button" accessibilityState={{ disabled: !valid }}
        style={({ pressed }) => [styles.add, { backgroundColor: valid ? c.primary : c.surface }, pressed && valid && { opacity: 0.8 }]}>
        <Text style={[styles.addText, { color: valid ? c.primaryText : c.mutedText }]}>{valid ? `Add ${k} kcal` : 'Enter calories'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  open: { minHeight: 48, borderRadius: radii.md + 2, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  openText: { fontFamily: type.weight.semibold, fontSize: 15 },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, fontFamily: type.weight.regular, fontSize: 16 },
  add: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: type.weight.bold, fontSize: 15 },
});
