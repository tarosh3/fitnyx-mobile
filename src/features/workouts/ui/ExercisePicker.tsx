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
import { rankUsage, sortAlphabetical, type UsageSort } from '@/src/features/workouts/usageRank';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExercises, fetchExerciseSuggestions, fetchExerciseUsage, type ExerciseUsage } from '@/src/lib/api/exercises';
import { cacheGet, cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';
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
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<UsageSort>('frequent');
  const [usage, setUsage] = useState<ExerciseUsage[]>([]);
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);
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
    setSort('frequent');
    setPart(initialPart);
    setMuscle(null);
    setEquipment(null);
    setPreview(null);
    setCreating(false);
  }, [visible, initialPart]);

  // The user's exercise usage (for frequency-first, recovery-aware ordering).
  // Hydrated from cache, refreshed from the store at most as often as LONG.
  useEffect(() => {
    if (!visible || !user) return;
    let alive = true;
    const key = cacheKeys.exerciseUsage(user.id);
    (async () => {
      const stale = await cacheGetStale<ExerciseUsage[]>(key);
      if (alive && stale) setUsage(stale);
      const fresh = await cacheGet<ExerciseUsage[]>(key);
      if (fresh) {
        if (alive) setUsage(fresh);
        return;
      }
      try {
        const u = await fetchExerciseUsage();
        if (alive) setUsage(u);
        cacheSet(key, u, cacheTTL.LONG).catch(() => undefined);
      } catch {
        /* keep whatever we hydrated */
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, user]);

  // "Suggested next": exercises the user usually does alongside what's already
  // in this workout. Only meaningful mid-workout (addedUuids present).
  const addedKey = addedUuids.join(',');
  useEffect(() => {
    if (!visible || !addedUuids.length) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    fetchExerciseSuggestions(addedUuids)
      .then((s) => { if (alive) setSuggestions(s); })
      .catch(() => { if (alive) setSuggestions([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, addedKey]);

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

  // Default "Frequent": your most-done exercises first (recovery-aware, or by
  // frequency within an explicit part), then the rest of the catalog. A-Z and
  // search fall back to the catalog order. Equipment/search narrow explicitly,
  // so usage isn't prepended then.
  // The "Suggested next" strip shows while browsing (no search/filter) mid-workout.
  const suggestOn = suggestions.length > 0 && !query.trim() && !part && !equipment;
  const displayed = useMemo<Exercise[]>(() => {
    const suggestIds = suggestOn ? new Set(suggestions.map((e) => e.uuid)) : null;
    const strip = (list: Exercise[]) => (suggestIds ? list.filter((e) => !suggestIds.has(e.uuid)) : list);
    if (sort === 'frequent' && !query.trim() && !equipment) {
      const ranked = rankUsage(usage, part).map((i) => i.exercise);
      const seen = new Set(ranked.map((e) => e.uuid));
      return strip([...ranked, ...items.filter((e) => !seen.has(e.uuid))]);
    }
    if (sort === 'az') return strip(sortAlphabetical(items));
    return strip(items);
  }, [sort, query, equipment, usage, part, items, suggestOn, suggestions]);
  const toggle = (ex: Exercise) => {
    if (mode === 'single') return setPicked((p) => (p[0]?.uuid === ex.uuid ? [] : [ex]));
    setPicked((p) => (p.some((x) => x.uuid === ex.uuid) ? p.filter((x) => x.uuid !== ex.uuid) : [...p, ex]));
  };

  const renderRow = (item: Exercise) => {
    const isAdded = added.has(item.uuid);
    const on = picked.some((x) => x.uuid === item.uuid);
    return (
      <Pressable key={item.uuid} disabled={isAdded} onPress={() => toggle(item)} accessibilityRole="checkbox"
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
      <Sheet visible={visible} title="New exercise" subtitle="Not in the library? Add your own." onClose={onClose} scroll={false} testID="exercise-picker">
        <CreateExerciseForm initialTitle={query.trim()} onCreated={created} onCancel={() => setCreating(false)} />
      </Sheet>
    );
  }

  // One scrolling list: search, filters and preview are its header, so nothing
  // ends up under the button when the keyboard leaves little room.
  const header = (
    <View style={styles.header}>
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Search size={20} color={c.mutedText} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search by name, muscle or equipment" placeholderTextColor={c.mutedText}
          style={[styles.input, { color: c.text }]} accessibilityLabel="Search exercises" returnKeyType="search" autoCorrect={false} />
      </View>
      <FinderChips part={part} muscle={muscle} equipment={equipment} onPart={setPart} onMuscle={setMuscle} onEquipment={setEquipment} />
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: c.mutedText }]}>SORT</Text>
        {(['frequent', 'az'] as UsageSort[]).map((s) => (
          <Pressable key={s} onPress={() => setSort(s)} accessibilityRole="button" accessibilityState={{ selected: sort === s }}
            accessibilityLabel={s === 'frequent' ? 'Sort by most frequent' : 'Sort alphabetically'}
            style={[styles.sortChip, { borderColor: sort === s ? c.accent : c.border, backgroundColor: sort === s ? c.accentSoft : 'transparent' }]}>
            <Text style={[styles.sortChipText, { color: sort === s ? c.accent : c.mutedText }]}>{s === 'frequent' ? 'Frequent' : 'A–Z'}</Text>
          </Pressable>
        ))}
      </View>
      {suggestOn ? (
        <View style={styles.suggestBlock}>
          <Text style={[styles.suggestLabel, { color: c.accent }]}>SUGGESTED NEXT</Text>
          {suggestions.slice(0, 5).map((s) => renderRow(s))}
          <View style={[styles.suggestDivider, { backgroundColor: c.border }]} />
        </View>
      ) : null}
      {preview ? <ExercisePreview key={preview.uuid} exercise={preview} onClose={() => setPreview(null)} /> : null}
    </View>
  );

  return (
    <Sheet visible={visible} title={title} subtitle={subtitle} onClose={onClose} footer={footer} scroll={false} testID="exercise-picker">
      <FlatList
        style={styles.list}
        data={displayed}
        keyExtractor={(e) => e.uuid}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.pad} color={c.primary} />
          : <Text style={[styles.empty, { color: c.mutedText }]}>{failed ? 'Couldn’t load exercises. Check your connection.' : 'No match. Try a shorter word, another muscle or Any equipment.'}</Text>}
        ListFooterComponent={
          <Pressable testID="picker-create" onPress={() => setCreating(true)} accessibilityRole="button"
            style={({ pressed }) => [styles.create, pressed && { opacity: 0.7 }]}>
            <Plus size={18} color={c.accent} />
            <Text style={[styles.createText, { color: c.accent }]} numberOfLines={1}>
              {query.trim() ? `Can’t find it? Create “${query.trim()}”` : 'Can’t find it? Create your own'}
            </Text>
          </Pressable>
        }
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
        renderItem={({ item }) => renderRow(item)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, minHeight: 52 },
  input: { flex: 1, fontFamily: type.weight.regular, fontSize: 16, minHeight: 48 },
  // Content-sized, then shrinks to the space the sheet has left (and scrolls).
  list: { flexGrow: 0, flexShrink: 1 },
  header: { paddingBottom: spacing.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  sortLabel: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1, marginRight: 2 },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, minHeight: 34, justifyContent: 'center' },
  sortChipText: { fontFamily: type.weight.semibold, fontSize: 13 },
  suggestBlock: { paddingTop: spacing.sm },
  suggestLabel: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1, paddingBottom: 2 },
  suggestDivider: { height: StyleSheet.hairlineWidth, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs, paddingVertical: 10, minHeight: 68 },
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
