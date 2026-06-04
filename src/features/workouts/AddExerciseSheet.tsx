import { Check, Dumbbell, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExercises } from '@/src/lib/api/exercises';
import { radii, spacing, type as t } from '@/src/styles/tokens';
import type { Exercise } from '@/src/types/exercise';

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (exercises: Exercise[]) => void;
  /** Exercises already in the session — shown dimmed and non-selectable. */
  existingUuids?: string[];
}

export function AddExerciseSheet({ visible, onClose, onAdd, existingUuids = [] }: Props) {
  const c = useThemeColors();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, Exercise>>({});

  const existing = useMemo(() => new Set(existingUuids), [existingUuids]);
  const selectedCount = Object.keys(selected).length;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    fetchExercises({
      page: 1,
      limit: 30,
      search: debounced,
      muscle: category === 'All' ? '' : category.toLowerCase(),
    })
      .then((res) => !cancelled && setResults(res.data || []))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visible, debounced, category]);

  // Reset transient state whenever the sheet closes.
  useEffect(() => {
    if (!visible) {
      setSelected({});
      setSearch('');
      setCategory('All');
    }
  }, [visible]);

  const toggle = (ex: Exercise) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[ex.uuid]) delete next[ex.uuid];
      else next[ex.uuid] = ex;
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Object.values(selected));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.handle, { backgroundColor: c.border }]} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]}>Add exercise</Text>
            <Text style={[styles.subtitle, { color: c.mutedText }]}>
              Log extra work for today&apos;s session
            </Text>
          </View>
          <Pressable onPress={onClose} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <X size={18} color={c.text} />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Search size={16} color={c.mutedText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises..."
            placeholderTextColor={c.mutedText}
            style={[styles.searchInput, { color: c.text }]}
            autoCorrect={false}
          />
        </View>

        <View style={styles.chipsRow}>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(x) => x}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item }) => {
              const active = category === item;
              return (
                <Pressable
                  onPress={() => setCategory(item)}
                  style={[styles.chip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                >
                  <Text style={[styles.chipText, { color: active ? c.primaryText : c.mutedText }]}>{item}</Text>
                </Pressable>
              );
            }}
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(x) => x.uuid}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={[styles.empty, { color: c.mutedText }]}>No exercises found.</Text>
            )
          }
          renderItem={({ item }) => {
            const isSel = !!selected[item.uuid];
            const already = existing.has(item.uuid);
            const muscle = item.primary_muscles?.[0]?.name;
            const equip = item.equipment?.[0]?.name;
            const img = item.media_url && !item.media_url.toLowerCase().endsWith('.mp4') ? item.media_url : null;
            return (
              <Pressable
                onPress={() => !already && toggle(item)}
                style={[styles.row, { backgroundColor: c.surface, borderColor: isSel ? c.primary : c.border, opacity: already ? 0.5 : 1 }]}
              >
                <View style={[styles.thumb, { backgroundColor: c.card }]}>
                  {img ? <Image source={{ uri: img }} style={styles.thumbImg} /> : <Dumbbell size={20} color={c.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.rowSub, { color: c.mutedText }]} numberOfLines={1}>
                    {[muscle, equip].filter(Boolean).join(' · ') || (already ? 'Already added' : 'Exercise')}
                  </Text>
                </View>
                <View style={[styles.addCircle, { borderColor: isSel ? c.primary : c.border, backgroundColor: isSel ? c.primary : 'transparent' }]}>
                  {already ? (
                    <Check size={16} color={c.mutedText} />
                  ) : isSel ? (
                    <Check size={16} color={c.primaryText} />
                  ) : (
                    <Plus size={16} color={c.primary} />
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        <Pressable
          disabled={selectedCount === 0}
          onPress={handleAdd}
          style={[styles.cta, { backgroundColor: selectedCount === 0 ? c.border : c.primary }]}
        >
          <Text style={[styles.ctaText, { color: selectedCount === 0 ? c.mutedText : c.primaryText }]}>
            {selectedCount === 0
              ? 'Select exercises to add'
              : `Add ${selectedCount} exercise${selectedCount > 1 ? 's' : ''}`}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '88%',
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  handle: { width: 40, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: t.weight.extrabold, fontSize: t.size.h2, letterSpacing: t.tracking.tight },
  subtitle: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.base,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontFamily: t.weight.medium, fontSize: t.size.body, padding: 0 },
  chipsRow: { marginTop: spacing.md },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontFamily: t.weight.bold, fontSize: t.size.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  empty: { fontFamily: t.weight.regular, fontSize: t.size.sm, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  rowTitle: { fontFamily: t.weight.bold, fontSize: t.size.body },
  rowSub: { fontFamily: t.weight.regular, fontSize: t.size.xs, marginTop: 2 },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cta: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
    marginTop: spacing.xs,
    height: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: t.weight.extrabold, fontSize: t.size.body, letterSpacing: 0.3 },
});
