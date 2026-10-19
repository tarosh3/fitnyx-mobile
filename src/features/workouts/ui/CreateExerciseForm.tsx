import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { uuidV4 } from '@/src/features/roam/recordingStore';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { CUSTOM_EQUIPMENT, CUSTOM_MUSCLES, MAX_CUSTOM_EXERCISES } from '@/src/lib/api/exercises';
import { offlineCreateExercise } from '@/src/lib/offline/customExercises';
import type { Exercise, TrackingType } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

const TRACKING: { value: TrackingType; label: string }[] = [
  { value: 'weight_reps', label: 'Weight × reps' },
  { value: 'reps', label: 'Reps only' },
  { value: 'duration', label: 'Time' },
  { value: 'cardio', label: 'Cardio' },
];

function Choices<T extends string>({ label, options, value, onChange, optional }: {
  label: string; options: readonly { value: T; label: string }[] | readonly T[]; value: T | null; onChange: (v: T | null) => void; optional?: boolean;
}) {
  const c = useThemeColors();
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: c.mutedText }]}>{label}{optional ? ' (optional)' : ''}</Text>
      <View style={styles.wrap}>
        {items.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(on && optional ? null : o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? c.text : c.border, backgroundColor: on ? c.text : c.card }]}>
              <Text style={[styles.chipText, { color: on ? c.background : c.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface Props {
  initialTitle: string;
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

/** Add an exercise the catalog doesn't have: private to the user, usable right away (also offline). */
export function CreateExerciseForm({ initialTitle, onCreated, onCancel }: Props) {
  const c = useThemeColors();
  const [title, setTitle] = useState(initialTitle);
  const [tracking, setTracking] = useState<TrackingType>('weight_reps');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [suggest, setSuggest] = useState(true);
  const [busy, setBusy] = useState(false);
  // Shown in the sheet: the app's toasts render underneath its modal.
  const [error, setError] = useState<string | null>(null);
  const name = title.trim().replace(/\s+/g, ' ');
  const valid = name.length >= 2 && name.length <= 60;

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ex = await offlineCreateExercise({
        uuid: uuidV4(), title: name, tracking_type: tracking, suggest,
        primary_muscle: muscle ?? undefined, equipment: equipment ?? undefined,
      });
      onCreated(ex);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      setError(err.status === 409 || err.status === 400 ? err.message ?? 'Couldn’t create it.' : 'Couldn’t create it. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.group}>
        <Text style={[styles.label, { color: c.mutedText }]}>Name</Text>
        <TextInput testID="custom-name" value={title} onChangeText={setTitle} maxLength={60} autoFocus placeholder="e.g. Landmine press"
          placeholderTextColor={c.mutedText} accessibilityLabel="Exercise name" returnKeyType="done"
          style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]} />
      </View>
      <Choices label="How you track it" options={TRACKING} value={tracking} onChange={(v) => v && setTracking(v)} />
      <Choices label="Main muscle" options={CUSTOM_MUSCLES} value={muscle} onChange={setMuscle} optional />
      <Choices label="Equipment" options={CUSTOM_EQUIPMENT} value={equipment} onChange={setEquipment} optional />
      <Pressable onPress={() => setSuggest((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: suggest }}
        style={[styles.suggest, { backgroundColor: suggest ? c.accentSoft : c.surface, borderColor: suggest ? c.primary : c.border }]}>
        <View style={[styles.box, suggest ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.mutedText }]}>
          {suggest ? <Check size={16} color={c.primaryText} strokeWidth={3} /> : null}
        </View>
        <View style={styles.grow}>
          <Text style={[styles.suggestTitle, { color: c.text }]}>Suggest it for everyone</Text>
          <Text style={[styles.hint, { color: c.mutedText }]}>We may add it to the library with a video and how-to.</Text>
        </View>
      </Pressable>
      <Text style={[styles.hint, { color: c.mutedText }]}>Only you can see it. Up to {MAX_CUSTOM_EXERCISES} of your own exercises.</Text>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <Button testID="custom-create" title="Create exercise" loading={busy} disabled={!valid} onPress={create} style={styles.noFlex} />
        <Button variant="quiet" title="Back to search" onPress={onCancel} style={styles.noFlex} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base, paddingBottom: spacing.base },
  group: { gap: spacing.sm },
  label: { fontFamily: type.weight.semibold, fontSize: 14 },
  input: { minHeight: 52, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, fontFamily: type.weight.regular, fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, minWidth: 0 },
  suggestTitle: { fontFamily: type.weight.bold, fontSize: 16 },
  hint: { fontFamily: type.weight.regular, fontSize: 14 },
  error: { fontFamily: type.weight.semibold, fontSize: 15 },
  actions: { gap: spacing.sm },
  noFlex: { flex: 0 },
});
