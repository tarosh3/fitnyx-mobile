import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DraftSet } from '@/src/features/workouts/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { type StepField, StepperSheet, stepFieldsFor } from '@/src/features/workouts/ui/StepperSheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TrackingType } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

/** "How hard?" in plain words; stored as RPE 6–10. */
const EFFORT = [
  { rpe: 6, label: 'Easy' },
  { rpe: 7, label: 'OK' },
  { rpe: 8, label: 'Hard' },
  { rpe: 9, label: 'Very hard' },
  { rpe: 10, label: 'Max' },
];

export function fieldsFor(t: TrackingType, d: DraftSet): StepField[] {
  if (t === 'cardio') return [stepFieldsFor.minutes(Math.max(1, Math.round(d.durationSec / 60))), stepFieldsFor.km(Math.round(d.distanceM / 100) / 10)];
  if (t === 'duration') return [{ ...stepFieldsFor.holdSec(d.durationSec || 45), display: (v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}` }];
  if (t === 'reps') return [stepFieldsFor.reps(d.reps), stepFieldsFor.addKg(d.weightKg)];
  return [stepFieldsFor.kg(d.weightKg), stepFieldsFor.reps(d.reps)];
}

export function draftFrom(t: TrackingType, base: DraftSet, v: Record<string, number>): DraftSet {
  if (t === 'cardio') return { ...base, durationSec: Math.round((v.min ?? 0) * 60), distanceM: Math.round((v.km ?? 0) * 1000) };
  if (t === 'duration') return { ...base, durationSec: Math.round(v.sec ?? base.durationSec) };
  return { ...base, reps: Math.round(v.reps ?? base.reps), weightKg: v.kg ?? base.weightKg };
}

interface Props {
  visible: boolean;
  title: string;
  subtitle: string;
  t: TrackingType;
  value: DraftSet;
  /** Logged sets can be rated and deleted; rows not done yet can be removed. */
  logged: boolean;
  rpe?: number | null;
  /** False for a brand-new set: the sheet then has only Save (and ✕). */
  canDelete?: boolean;
  onSave: (d: DraftSet, rpe: number | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SetEditorSheet({ visible, title, subtitle, t, value, logged, rpe: initialRpe, canDelete = true, onSave, onDelete, onClose }: Props) {
  const c = useThemeColors();
  const [rpe, setRpe] = useState<number | null>(initialRpe ?? null);
  useEffect(() => { if (visible) setRpe(initialRpe ?? null); }, [visible]);

  return (
    <StepperSheet visible={visible} title={title} subtitle={subtitle} fields={fieldsFor(t, value)}
      saveLabel={logged ? 'Save changes' : 'Done'} onClose={onClose}
      onSave={(v) => onSave(draftFrom(t, value, v), rpe)}
      secondary={canDelete ? <Button variant="danger" title={logged ? 'Delete this set' : 'Remove a set'} onPress={onDelete} /> : undefined}>
      {logged ? (
        <View style={styles.effort}>
          <Text style={[styles.label, { color: c.text }]}>How hard was it?</Text>
          <View style={styles.chips}>
            {EFFORT.map((e) => {
              const on = rpe === e.rpe;
              return (
                <Pressable key={e.rpe} onPress={() => setRpe(on ? null : e.rpe)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  accessibilityLabel={e.label}
                  style={({ pressed }) => [styles.chip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.accentSoft : c.surface }, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.chipText, { color: on ? c.accent : c.text }]}>{e.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </StepperSheet>
  );
}

const styles = StyleSheet.create({
  effort: { gap: spacing.sm },
  label: { fontFamily: type.weight.semibold, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1.5, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
