import { useRouter } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Part, PARTS, partLabel, partOf } from '@/src/features/workouts/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { WorkoutGlyph } from '@/src/features/workouts/ui/WorkoutGlyph';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { fetchExercises } from '@/src/lib/api/exercises';
import { cacheGet, cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

const PAGE = 30;

type ListPage = { data: Exercise[]; total: number };

/** A body part, or 'mine' = the user's own custom exercises. */
type Filter = Part | 'mine';

const listKey = (query: string, part: Filter | null) => cacheKeys.exerciseListPage(`${query}|${part ?? ''}|lib`);

const fetchPage = (query: string, part: Filter | null, page: number) =>
  fetchExercises({ page, limit: PAGE, search: query, muscle: part && part !== 'mine' ? part : '', mine: part === 'mine', fields: 'summary' });

/** Warms the first page of every body-part chip (skipping fresh ones), one at a time, so switching chips is instant. */
async function prefetchParts() {
  for (const { key } of PARTS) {
    const cacheKey = listKey('', key);
    if (await cacheGet<ListPage>(cacheKey)) continue;
    const res = await fetchPage('', key, 1);
    const data = res.data ?? [];
    await cacheSet(cacheKey, { data, total: res.meta?.total ?? data.length }, cacheTTL.DAY);
  }
}

export function LibraryTab({ header }: { header: React.ReactElement }) {
  const workoutInset = useWorkoutOverlayInset();
  const c = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [part, setPart] = useState<Filter | null>(null);
  const [items, setItems] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const req = useRef(0);
  const prefetched = useRef(false);

  const load = async (nextPage: number) => {
    const id = ++req.current;
    const filterKey = listKey(query.trim(), part);
    setLoading(true);
    if (nextPage === 1) {
      const cached = await cacheGetStale<ListPage>(filterKey);
      if (id !== req.current) return;
      // No cache: drop the previous filter's rows so the spinner shows instead of a stale list.
      setItems(cached?.data ?? []);
      setTotal(cached?.total ?? 0);
    }
    try {
      const res = await fetchPage(query.trim(), part, nextPage);
      if (id !== req.current) return;
      const data = res.data ?? [];
      setItems((prev) => (nextPage === 1 ? data : [...prev, ...data.filter((d) => !prev.some((p) => p.uuid === d.uuid))]));
      setTotal(res.meta?.total ?? data.length);
      setPage(nextPage);
      setFailed(false);
      if (nextPage === 1) cacheSet(filterKey, { data, total: res.meta?.total ?? data.length }, cacheTTL.DAY).catch(() => undefined);
      if (nextPage === 1 && !prefetched.current) {
        prefetched.current = true;
        prefetchParts().catch(() => undefined);
      }
    } catch {
      if (id === req.current) setFailed(true);
    } finally {
      if (id === req.current) setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, part]);

  const top = (
    <View>
      {header}
      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
        <Search size={20} color={c.mutedText} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={c.mutedText}
          style={[styles.input, { color: c.text }]} accessibilityLabel="Search exercises" returnKeyType="search" autoCorrect={false} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {[null, 'mine' as const, ...PARTS.map((p) => p.key)].map((p) => {
          const on = part === p;
          const tone = p && p !== 'mine' ? c.parts[p] : null;
          return (
            <Pressable key={p ?? 'all'} onPress={() => setPart(p)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? (tone?.fg ?? c.text) : c.border, backgroundColor: on ? (tone?.bg ?? c.text) : c.card }]}>
              {p && p !== 'mine' && tone ? <WorkoutGlyph part={p} size={22} color={on ? tone.fg : c.mutedText} /> : null}
              <Text style={[styles.chipText, { color: on ? (tone?.fg ?? c.background) : c.text }]}>{p === 'mine' ? 'Mine' : p ? partLabel(p) : 'All'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {items.length ? <Text style={[styles.count, { color: c.mutedText }]}>{total.toLocaleString('en-US')} exercises</Text> : null}
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(e) => e.uuid}
      ListHeaderComponent={top}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => { if (!loading && items.length < total) load(page + 1); }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: spacing['2xl'] }} color={c.primary} /> : (
        <Text style={[styles.empty, { color: c.mutedText }]}>
          {failed ? 'Couldn’t load exercises. Check your connection.'
            : part === 'mine' ? 'No exercises of your own yet. Add one from “Add exercise” in a workout or routine.'
              : 'No exercises match. Try a shorter word or another body part.'}
        </Text>
      )}
      ListFooterComponent={loading && items.length ? <ActivityIndicator style={{ margin: spacing.lg }} color={c.primary} /> : null}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => router.push(`/workouts/exercise/${item.uuid}`)} accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${partLabel(partOf(item))}. Open`}
          style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.border },
            index === 0 && styles.first, index === items.length - 1 && styles.last, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
            pressed && { opacity: 0.7 }]}>
          <ExerciseThumb exercise={item} />
          <View style={styles.grow}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.meta, { color: c.mutedText }]} numberOfLines={1}>
              {item.owner_id ? 'Yours · ' : ''}{partLabel(partOf(item))}{item.equipment?.[0]?.name ? ` · ${item.equipment[0].name}` : ''}
            </Text>
          </View>
          <ChevronRight size={20} color={c.mutedText} />
        </Pressable>
      )}
      contentContainerStyle={[styles.content, { paddingBottom: 140 + workoutInset }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, minHeight: 52, marginTop: spacing.base },
  input: { flex: 1, fontFamily: type.weight.regular, fontSize: 16, minHeight: 48 },
  chipRow: { marginHorizontal: -16, marginTop: spacing.md, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: type.weight.semibold, fontSize: 15 },
  count: { fontFamily: type.weight.regular, fontSize: 13, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 80, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  first: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  last: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  grow: { flex: 1, minWidth: 0 },
  name: { fontFamily: type.weight.bold, fontSize: 16 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  empty: { fontFamily: type.weight.regular, fontSize: 15, textAlign: 'center', marginTop: spacing['2xl'] },
});
