import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { addDays, autoGran, formatRange, isoOf, spanDays, toMs, validateRange, type DateRange } from '../range';
import { Chip } from './bits';

type Field = 'from' | 'to';

function quickPicks(today: string): { label: string; range: DateRange }[] {
  const [y, m] = today.split('-').map(Number);
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastMonthEnd = addDays(monthStart, -1);
  return [
    { label: 'This month', range: { from: monthStart, to: today } },
    { label: 'Last month', range: { from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd } },
    { label: 'Last 6 months', range: { from: isoOf(Date.UTC(y, m - 7, Number(today.slice(8)) + 1)), to: today } },
    { label: 'Year to date', range: { from: `${y}-01-01`, to: today } },
  ];
}

/** Local calendar date ↔ a Date at local midnight, for the native picker. */
const toLocalDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fromLocalDate = (d: Date) => isoOf(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

export function CustomRangeSheet({ visible, initial, today, onClose, onApply }: {
  visible: boolean; initial: DateRange; today: string; onClose: () => void; onApply: (r: DateRange) => void;
}) {
  const c = useThemeColors();
  const [draft, setDraft] = useState<DateRange>(initial);
  const [editing, setEditing] = useState<Field | null>(null);
  useEffect(() => { if (visible) { setDraft(initial); setEditing(null); } }, [visible, initial]);

  const error = validateRange(draft.from, draft.to, today);
  const n = error ? 0 : spanDays(draft);
  const pickDate = (field: Field, d: Date) => setDraft((r) => ({ ...r, [field]: fromLocalDate(d) }));

  const field = (key: Field, label: string) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.mutedText }]}>{label}</Text>
      <Pressable testID={`range-${key}`} onPress={() => setEditing(editing === key ? null : key)} accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatRange({ from: draft[key], to: draft[key] })}`}
        style={[styles.input, { backgroundColor: c.background, borderColor: editing === key ? c.accent : c.border }]}>
        <Calendar size={16} color={c.mutedText} strokeWidth={1.8} />
        <Text style={[styles.inputText, { color: c.text }]}>{formatRange({ from: draft[key], to: draft[key] })}</Text>
      </Pressable>
    </View>
  );

  return (
    <Sheet visible={visible} title="Custom range" subtitle="Up to 1 year at a time" onClose={onClose} testID="custom-range-sheet"
      footer={(
        <Pressable testID="range-apply" disabled={!!error} onPress={() => onApply(draft)} accessibilityRole="button" accessibilityState={{ disabled: !!error }}
          style={[styles.apply, { backgroundColor: error ? c.border : c.primary }]}>
          <Text style={[styles.applyText, { color: error ? c.mutedText : c.primaryText }]}>Show this range</Text>
        </Pressable>
      )}>
      <View style={styles.quick}>
        {quickPicks(today).map((q) => (
          <Chip key={q.label} label={q.label} active={q.range.from === draft.from && q.range.to === draft.to} onPress={() => { setDraft(q.range); setEditing(null); }} />
        ))}
      </View>
      <View style={styles.fields}>
        {field('from', 'From')}
        {field('to', 'To')}
      </View>
      {editing ? (
        <DateTimePicker
          value={toLocalDate(draft[editing])}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={toLocalDate(today)}
          minimumDate={new Date(toMs(addDays(today, -365 * 5)))}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setEditing(null);
            if (event.type === 'set' && date) pickDate(editing, date);
          }}
        />
      ) : null}
      <Text testID="range-message" style={[styles.message, { color: error ? c.destructive : c.mutedText }]}>
        {error ?? `${n} days · shown by ${autoGran(n)}`}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.base },
  field: { flex: 1, gap: 6 },
  fieldLabel: { fontFamily: type.weight.semibold, fontSize: 12 },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inputText: { fontFamily: type.weight.semibold, fontSize: 14 },
  message: { fontFamily: type.weight.semibold, fontSize: 13, marginTop: spacing.md },
  apply: { minHeight: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: type.weight.bold, fontSize: 15 },
});
