import { useRouter } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Part, PARTS, partLabel, partOf } from '@/src/features/workouts/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExercises } from '@/src/lib/api/exercises';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

const PAGE = 30;

export function LibraryTab({ header }: { header: React.ReactElement }) {
  const c = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [part, setPart] = useState<Part | null>(null);
  const [items, setItems] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const req = useRef(0);

  const load = async (nextPage: number) => {
    const id = ++req.current;
    const filterKey = cacheKeys.exerciseListPage(`${query.trim()}|${part ?? ''}|lib`);
    setLoading(true);
    if (nextPage === 1) {
      const cached = await cacheGetStale<{ data: Exercise[]; total: number }>(filterKey);
      if (cached && id === req.current) { setItems(cached.data); setTotal(cached.total); }
    }
    try {
      const res = await fetchExercises({ page: nextPage, limit: PAGE, search: query.trim(), muscle: part ?? '' });
      if (id !== req.current) return;
      const data = res.data ?? [];
      setItems((prev) => (nextPage === 1 ? data : [...prev, ...data.filter((d) => !prev.some((p) => p.uuid === d.uuid))]));
      setTotal(res.meta?.total ?? data.length);
      setPage(nextPage);
      setFailed(false);
      if (nextPage === 1) cacheSet(filterKey, { data, total: res.meta?.total ?? data.length }, cacheTTL.DAY).catch(() => undefined);
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
        {[null, ...PARTS.map((p) => p.key)].map((p) => {
          const on = part === p;
          const tone = p ? c.parts[p] : null;
          return (
            <Pressable key={p ?? 'all'} onPress={() => setPart(p)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? (tone?.fg ?? c.text) : c.border, backgroundColor: on ? (tone?.bg ?? c.text) : c.card }]}>
              {tone ? <View style={[styles.dot, { backgroundColor: tone.fg }]} /> : null}
              <Text style={[styles.chipText, { color: on ? (tone?.fg ?? c.background) : c.text }]}>{p ? partLabel(p) : 'All'}</Text>
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
          {failed ? 'Couldn’t load exercises. Check your connection.' : 'No exercises match. Try a shorter word or another body part.'}
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
              {partLabel(partOf(item))}{item.equipment?.[0]?.name ? ` · ${item.equipment[0].name}` : ''}
            </Text>
          </View>
          <ChevronRight size={20} color={c.mutedText} />
        </Pressable>
      )}
      contentContainerStyle={styles.content}
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
  dot: { width: 8, height: 8, borderRadius: 4 },
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
