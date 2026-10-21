import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useRoutines } from '@/src/features/workouts/hooks';
import { describeTarget, fmtKg, trackingOf } from '@/src/features/workouts/model';
import { TEMPLATES } from '@/src/features/workouts/templates';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { StepperSheet, stepFieldsFor, type StepField } from '@/src/features/workouts/ui/StepperSheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { createRoutine, getRoutine, updateRoutine, type RoutineExerciseInput } from '@/src/lib/api/routines';
import { fetchExerciseWithCache } from '@/src/lib/offline';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

type Item = RoutineExerciseInput & { exercise?: Exercise };
const MAX = 15;

function defaultsFor(ex: Exercise): RoutineExerciseInput {
  const t = trackingOf(ex);
  if (t === 'cardio') return { exercise_uuid: ex.uuid, target_sets: 1, target_duration_sec: 1200 };
  if (t === 'duration') return { exercise_uuid: ex.uuid, target_sets: 3, target_duration_sec: 45 };
  if (t === 'reps') return { exercise_uuid: ex.uuid, target_sets: 3, target_reps: 12 };
  return { exercise_uuid: ex.uuid, target_sets: 3, target_reps: 10, target_weight_kg: 20 };
}

export default function RoutineEditor() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const space = useBottomBarSpace();
  const { isOffline } = useOfflineAware();
  const { id, name: presetName } = useLocalSearchParams<{ id?: string; name?: string }>();
  const routines = useRoutines();
  const [title, setTitle] = useState(presetName ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getRoutine(id)
      .then((r) => {
        setTitle(r.title);
        setItems(r.exercises.map((e) => ({
          exercise_uuid: e.exercise_uuid, exercise: e.exercise, target_sets: e.target_sets, target_reps: e.target_reps,
          target_weight_kg: e.target_weight_kg, target_duration_sec: e.target_duration_sec, target_distance_m: e.target_distance_m, rest_seconds: e.rest_seconds,
        })));
      })
      .catch(() => toast('Couldn’t load this routine. Check your connection.', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const useTemplate = async (name: string) => {
    const t = TEMPLATES.find((x) => x.name === name);
    if (!t) return;
    setTemplate(name);
    if (!title.trim()) setTitle(name === 'Cardio' ? 'Cardio' : `${name} day`);
    const loaded = await Promise.all(t.items.map(async (it) => ({ ...it, exercise: (await fetchExerciseWithCache(it.exercise_uuid).catch(() => null)) ?? undefined })));
    setItems(loaded.filter((x) => x.exercise));
  };

  const move = (i: number, d: number) => setItems((p) => {
    const j = i + d;
    if (j < 0 || j >= p.length) return p;
    const next = [...p];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    const name = title.trim();
    if (!name) return toast('Give your routine a name', 'error');
    if (!items.length) return toast('Add at least one exercise', 'error');
    if (isOffline) return toast('You’re offline. Connect to save your routine.', 'error');
    setSaving(true);
    try {
      const input = { title: name, exercises: items.map(({ exercise: _e, ...rest }) => rest) };
      const saved = id ? await updateRoutine(id, input) : await createRoutine(input);
      const others = (routines.data ?? []).filter((r) => r.id !== saved.id);
      routines.setData([saved, ...others]);
      toast(`Saved “${saved.title}”`, 'success');
      if (id) router.back();
      else router.replace(`/workouts/routine/${saved.id}`);
    } catch (e: any) {
      toast(e?.data?.error || e?.message || 'Couldn’t save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const current = editing != null ? items[editing] : null;
  const t = current ? trackingOf(current.exercise) : 'weight_reps';
  const fields: StepField[] = !current ? [] : t === 'cardio'
    ? [stepFieldsFor.minutes(Math.round((current.target_duration_sec ?? 1200) / 60)), stepFieldsFor.km((current.target_distance_m ?? 0) / 1000)]
    : t === 'duration'
      ? [stepFieldsFor.sets(current.target_sets ?? 3), stepFieldsFor.holdSec(current.target_duration_sec ?? 45)]
      : t === 'reps'
        ? [stepFieldsFor.sets(current.target_sets ?? 3), stepFieldsFor.reps(current.target_reps ?? 12), stepFieldsFor.addKg(current.target_weight_kg ?? 0)]
        : [stepFieldsFor.sets(current.target_sets ?? 3), stepFieldsFor.reps(current.target_reps ?? 10), stepFieldsFor.kg(current.target_weight_kg ?? 20)];

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title={id ? 'Edit routine' : 'New routine'} subtitle={id ? undefined : 'One screen. Save when ready.'} />
      {loading ? <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={c.primary} /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: c.text }]}>Name</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Push day" placeholderTextColor={c.mutedText} maxLength={60}
            accessibilityLabel="Routine name" style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]} />

          {!id ? (
            <>
              <Text style={[styles.label, { color: c.text, marginTop: spacing.lg }]}>Start from a template</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
                {TEMPLATES.map((tp) => {
                  const on = template === tp.name;
                  return (
                    <Pressable key={tp.name} onPress={() => useTemplate(tp.name)} accessibilityRole="button" accessibilityState={{ selected: on }}
                      style={[styles.chip, { borderColor: on ? c.text : c.border, backgroundColor: on ? c.text : c.card }]}>
                      <Text style={[styles.chipText, { color: on ? c.background : c.text }]}>{tp.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.headRow}>
            <Text style={[styles.section, { color: c.text }]}>Exercises</Text>
            <Text style={[styles.meta, { color: c.mutedText }]}>{items.length} of {MAX}</Text>
          </View>
          {!items.length ? (
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.meta, { color: c.mutedText, textAlign: 'center' }]}>No exercises yet. Pick a template above, or add exercises below.</Text>
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
              {items.map((it, i) => (
                <View key={`${it.exercise_uuid}-${i}`} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
                  <ExerciseThumb exercise={it.exercise} size={44} />
                  <Pressable style={styles.grow} onPress={() => setEditing(i)} accessibilityRole="button"
                    accessibilityLabel={`${it.exercise?.title}, ${describeTarget(trackingOf(it.exercise), it)}. Change targets`}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{it.exercise?.title ?? 'Exercise'}</Text>
                    <Text style={[styles.target, { color: c.accent }]}>{describeTarget(trackingOf(it.exercise), it)} · change</Text>
                  </Pressable>
                  <Pressable onPress={() => move(i, -1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel={`Move ${it.exercise?.title} up`} style={[styles.tiny, i === 0 && styles.dim]}>
                    <ArrowUp size={20} color={c.text} />
                  </Pressable>
                  <Pressable onPress={() => move(i, 1)} disabled={i === items.length - 1} accessibilityRole="button" accessibilityLabel={`Move ${it.exercise?.title} down`} style={[styles.tiny, i === items.length - 1 && styles.dim]}>
                    <ArrowDown size={20} color={c.text} />
                  </Pressable>
                  <Pressable onPress={() => setItems((p) => p.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove ${it.exercise?.title}`} style={styles.tiny}>
                    <X size={20} color={c.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable testID="editor-add" disabled={items.length >= MAX} onPress={() => setPickerOpen(true)} accessibilityRole="button"
            style={({ pressed }) => [styles.add, { borderColor: c.border }, items.length >= MAX && styles.dim, pressed && { opacity: 0.7 }]}>
            <Plus size={20} color={c.accent} /><Text style={[styles.addText, { color: c.accent }]}>Add exercises</Text>
          </Pressable>
        </ScrollView>
      )}
      <BottomBar>
        <Button testID="editor-save" title="Save routine" loading={saving} onPress={save} icon={<Check size={20} color={c.primaryText} />} />
      </BottomBar>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} mode="multi" title="Add exercises"
        addedUuids={items.map((i) => i.exercise_uuid)} emptyLabel="Tick the exercises you want"
        confirmLabel={(p) => `Add ${p.length} exercise${p.length === 1 ? '' : 's'}`}
        onConfirm={(picked) => {
          setItems((p) => [...p, ...picked.slice(0, MAX - p.length).map((ex) => ({ ...defaultsFor(ex), exercise: ex }))]);
          setPickerOpen(false);
        }} />

      <StepperSheet visible={!!current} title={current?.exercise?.title ?? ''} subtitle="Targets for each workout" fields={fields} saveLabel="Save targets"
        onClose={() => setEditing(null)}
        onSave={(v) => {
          setItems((p) => p.map((it, i) => (i !== editing ? it : {
            ...it,
            target_sets: v.sets ?? it.target_sets,
            target_reps: v.reps ?? it.target_reps,
            target_weight_kg: v.kg != null ? (v.kg > 0 ? Number(fmtKg(v.kg)) : undefined) : it.target_weight_kg,
            target_duration_sec: v.sec ?? (v.min != null ? Math.round(v.min * 60) : it.target_duration_sec),
            target_distance_m: v.km != null ? (v.km > 0 ? Math.round(v.km * 1000) : undefined) : it.target_distance_m,
          })));
          setEditing(null);
        }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  label: { fontFamily: type.weight.bold, fontSize: 15, marginBottom: spacing.sm },
  input: { minHeight: 56, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base, fontFamily: type.weight.semibold, fontSize: 18 },
  bleed: { marginHorizontal: -16 },
  chips: { paddingHorizontal: 16, gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 15 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  section: { fontFamily: type.weight.extrabold, fontSize: 19 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  emptyCard: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingLeft: spacing.md, paddingRight: spacing.xs },
  grow: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  name: { fontFamily: type.weight.bold, fontSize: 16 },
  target: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  tiny: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.3 },
  add: { minHeight: 60, borderRadius: radii.xl, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  addText: { fontFamily: type.weight.bold, fontSize: 16 },
});
