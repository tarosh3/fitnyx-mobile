import { ArrowRight, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const MAX_KCAL = 5000;

/** For food that isn't in the list: just calories (and protein if known). */
export function QuickAdd({ onAdd, busy = false }: { busy?: boolean; onAdd: (name: string, kcal: number, protein: number) => void }) {
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
        style={({ pressed }) => [styles.open, { borderColor: c.border, backgroundColor: c.card }, pressed && { opacity: 0.7 }]}>
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><Zap size={20} color={c.accent} /></View>
        <View style={styles.openBody}><Text style={[styles.openText, { color: c.text }]}>Quick add</Text><Text style={[styles.caption, { color: c.mutedText }]}>Know the calories? Log them directly.</Text></View>
        <ArrowRight size={18} color={c.mutedText} />
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
      <Pressable onPress={() => valid && !busy && onAdd(name.trim() || 'Quick add', k, p)} disabled={!valid || busy} accessibilityRole="button" accessibilityState={{ disabled: !valid || busy, busy }}
        style={({ pressed }) => [styles.add, { backgroundColor: valid ? c.primary : c.surface }, pressed && valid && { opacity: 0.8 }]}>
        <Text style={[styles.addText, { color: valid ? c.primaryText : c.mutedText }]}>{busy ? 'Saving…' : valid ? `Add ${k} kcal` : 'Enter calories'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  open: { minHeight: 80, padding: 16, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  openBody: { flex: 1, gap: 4 },
  caption: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
  openText: { fontFamily: type.weight.semibold, fontSize: 15 },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, fontFamily: type.weight.regular, fontSize: 16 },
  add: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: type.weight.bold, fontSize: 15 },
});
