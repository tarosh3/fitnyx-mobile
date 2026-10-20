import { Check, Plus, Search } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type EquipmentKey, finderMeta } from '@/src/features/workouts/finder';
import { type Part } from '@/src/features/workouts/model';
import { CreateExerciseForm } from '@/src/features/workouts/ui/CreateExerciseForm';
import { ExercisePreview } from '@/src/features/workouts/ui/ExercisePreview';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { FinderChips } from '@/src/features/workouts/ui/FinderChips';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExercises } from '@/src/lib/api/exercises';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Backend body-part term for each chip (see bodyPartSynonyms). */
const MUSCLE_TERM: Record<Part, string> = { chest: 'chest', back: 'back', legs: 'legs', shoulders: 'shoulders', arms: 'arms', core: 'core', cardio: 'cardio' };

interface Props {
  visible: boolean;
  onClose: () => void;
  /** single = pick one (swap, cardio); multi = tick several. */
  mode: 'single' | 'multi';
  title: string;
  subtitle?: string;
  initialPart?: Part | null;
  /** Already in the workout/routine: shown as "Added", not selectable. */
  addedUuids?: string[];
  confirmLabel: (picked: Exercise[]) => string;
  emptyLabel: string;
  onConfirm: (picked: Exercise[]) => void;
}

export function ExercisePicker({ visible, onClose, mode, title, subtitle, initialPart = null, addedUuids = [], confirmLabel, emptyLabel, onConfirm }: Props) {
  const c = useThemeColors();
  const [query, setQuery] = useState('');
  const [part, setPart] = useState<Part | null>(initialPart);
  // A muscle within the part (backend muscle-name term) and an equipment group.
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<EquipmentKey | null>(null);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setPicked([]);
    setQuery('');
    setPart(initialPart);
    setMuscle(null);
    setEquipment(null);
    setPreview(null);
    setCreating(false);
  }, [visible, initialPart]);

  // A new custom exercise goes to the top of the list, already picked.
  const created = (ex: Exercise) => {
    setItems((prev) => [ex, ...prev.filter((x) => x.uuid !== ex.uuid)]);
    setPicked((p) => (mode === 'single' ? [ex] : [...p, ex]));
    setCreating(false);
  };

  useEffect(() => {
    if (!visible) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchExercises({
          page: 1, limit: 40, search: query.trim(), muscle: muscle ?? (part ? MUSCLE_TERM[part] : ''), equipment: equipment ?? undefined,
        });
        if (id === reqId.current) { setItems(res.data ?? []); setFailed(false); }
      } catch {
        if (id === reqId.current) setFailed(true);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [visible, query, part, muscle, equipment]);

  const added = useMemo(() => new Set(addedUuids), [addedUuids]);
  const toggle = (ex: Exercise) => {
    if (mode === 'single') return setPicked((p) => (p[0]?.uuid === ex.uuid ? [] : [ex]));
    setPicked((p) => (p.some((x) => x.uuid === ex.uuid) ? p.filter((x) => x.uuid !== ex.uuid) : [...p, ex]));
  };

  const footer = (
    <Pressable
      testID="picker-confirm"
      disabled={!picked.length}
      onPress={() => onConfirm(picked)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !picked.length }}
      style={({ pressed }) => [styles.cta, picked.length ? { backgroundColor: c.primary } : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }, pressed && picked.length > 0 && { transform: [{ scale: 0.98 }] }]}
    >
      <Text style={[styles.ctaText, { color: picked.length ? c.primaryText : c.mutedText }]}>{picked.length ? confirmLabel(picked) : emptyLabel}</Text>
    </Pressable>
  );

  if (creating) {
    return (
      <Sheet visible={visible} title="New exercise" subtitle="Not in the library? Add your own." onClose={onClose} testID="exercise-picker">
        <CreateExerciseForm initialTitle={query.trim()} onCreated={created} onCancel={() => setCreating(false)} />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} title={title} subtitle={subtitle} onClose={onClose} footer={footer} testID="exercise-picker">
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Search size={20} color={c.mutedText} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search by name, muscle or equipment" placeholderTextColor={c.mutedText}
          style={[styles.input, { color: c.text }]} accessibilityLabel="Search exercises" returnKeyType="search" autoCorrect={false} />
      </View>
      <FinderChips part={part} muscle={muscle} equipment={equipment} onPart={setPart} onMuscle={setMuscle} onEquipment={setEquipment} />
      {preview ? <ExercisePreview key={preview.uuid} exercise={preview} onClose={() => setPreview(null)} /> : null}
      <View style={[styles.list, { borderColor: c.border }]}>
        {loading && !items.length ? (
          <ActivityIndicator style={styles.pad} color={c.primary} />
        ) : failed && !items.length ? (
          <Text style={[styles.empty, { color: c.mutedText }]}>Couldn’t load exercises. Check your connection.</Text>
        ) : !items.length ? (
          <Text style={[styles.empty, { color: c.mutedText }]}>No match. Try a shorter word, another muscle or Any equipment.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(e) => e.uuid}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
            renderItem={({ item }) => {
              const isAdded = added.has(item.uuid);
              const on = picked.some((x) => x.uuid === item.uuid);
              return (
                <Pressable disabled={isAdded} onPress={() => toggle(item)} accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: isAdded }} accessibilityLabel={`${item.title}${isAdded ? ', already added' : ''}`}
                  style={[styles.row, on && { backgroundColor: c.accentSoft }, isAdded && { opacity: 0.55 }]}>
                  <Pressable onPress={() => setPreview(item)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Watch ${item.title}`} testID={`preview-${item.uuid}`}>
                    <ExerciseThumb exercise={item} size={56} />
                  </Pressable>
                  <View style={styles.grow}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.meta, { color: c.mutedText }]} numberOfLines={1}>{finderMeta(item)}</Text>
                  </View>
                  {isAdded ? (
                    <Text style={[styles.added, { color: c.accent }]}>Added</Text>
                  ) : (
                    <View style={[styles.box, { borderColor: on ? c.primary : c.mutedText, backgroundColor: on ? c.primary : 'transparent' }]}>
                      {on ? <Check size={18} color={c.primaryText} /> : null}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
      <Pressable testID="picker-create" onPress={() => setCreating(true)} accessibilityRole="button"
        style={({ pressed }) => [styles.create, pressed && { opacity: 0.7 }]}>
        <Plus size={18} color={c.accent} />
        <Text style={[styles.createText, { color: c.accent }]} numberOfLines={1}>
          {query.trim() ? `Can’t find it? Create “${query.trim()}”` : 'Can’t find it? Create your own'}
        </Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, minHeight: 52 },
  input: { flex: 1, fontFamily: type.weight.regular, fontSize: 16, minHeight: 48 },
  list: { marginTop: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md + 2, maxHeight: 360, minHeight: 120, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 68 },
  sep: { height: StyleSheet.hairlineWidth },
  grow: { flex: 1, minWidth: 0 },
  name: { fontFamily: type.weight.bold, fontSize: 16 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  added: { fontFamily: type.weight.bold, fontSize: 14 },
  empty: { fontFamily: type.weight.regular, fontSize: 15, textAlign: 'center', padding: spacing.lg },
  pad: { padding: spacing.lg },
  create: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingTop: spacing.sm },
  createText: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  cta: { minHeight: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: type.weight.bold, fontSize: 17 },
});
