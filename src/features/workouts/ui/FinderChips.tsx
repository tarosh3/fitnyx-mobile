import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { EQUIPMENT_CHIPS, type EquipmentKey, MUSCLES_BY_PART } from '@/src/features/workouts/finder';
import { type Part, PARTS, partLabel } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Option<T> { key: T; label: string }

function ChipRow<T extends string>({ options, value, onChange, allLabel, label, testID }: {
  options: Option<T>[]; value: T | null; onChange: (v: T | null) => void; allLabel: string; label: string; testID: string;
}) {
  const c = useThemeColors();
  // A part chosen for the user (a leg workout opens on Legs) can be off to the side: bring it into view.
  const scroll = useRef<ScrollView>(null);
  const xs = useRef<Record<string, number>>({});
  useEffect(() => {
    if (value && xs.current[value] != null) scroll.current?.scrollTo({ x: Math.max(0, xs.current[value] - 16), animated: true });
  }, [value]);
  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.row}
      keyboardShouldPersistTaps="handled" testID={testID} accessibilityLabel={label}>
      {[{ key: null, label: allLabel } as Option<T | null>, ...options].map((o) => {
        const on = value === o.key;
        return (
          <Pressable key={o.key ?? 'all'} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            onLayout={(e) => {
              if (!o.key) return;
              xs.current[o.key] = e.nativeEvent.layout.x;
              if (on) scroll.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 16), animated: false });
            }}
            accessibilityLabel={`${label}: ${o.label}`}
            style={[styles.chip, { borderColor: on ? c.text : c.border, backgroundColor: on ? c.text : c.card }]}>
            <Text style={[styles.chipText, { color: on ? c.background : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Narrow the exercise list the way people remember a move: body part, then
 * the muscle it worked, then what they held (or sat in).
 */
export function FinderChips({ part, muscle, equipment, onPart, onMuscle, onEquipment }: {
  part: Part | null; muscle: string | null; equipment: EquipmentKey | null;
  onPart: (p: Part | null) => void; onMuscle: (term: string | null) => void; onEquipment: (e: EquipmentKey | null) => void;
}) {
  const muscles = part ? MUSCLES_BY_PART[part] : [];
  return (
    <>
      <ChipRow testID="finder-parts" label="Body part" allLabel="All" value={part}
        options={PARTS.map((p) => ({ key: p.key, label: partLabel(p.key) }))}
        onChange={(p) => { onPart(p); onMuscle(null); }} />
      {muscles.length ? (
        <ChipRow testID="finder-muscles" label="Muscle" allLabel={`Any ${partLabel(part!).toLowerCase()}`} value={muscle}
          options={muscles.map((m) => ({ key: m.term, label: m.label }))} onChange={onMuscle} />
      ) : null}
      <ChipRow testID="finder-equipment" label="Equipment" allLabel="Any equipment" value={equipment}
        options={EQUIPMENT_CHIPS.map((e) => ({ key: e.key, label: e.label }))} onChange={onEquipment} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { marginHorizontal: -16, marginTop: spacing.sm, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14 },
});
