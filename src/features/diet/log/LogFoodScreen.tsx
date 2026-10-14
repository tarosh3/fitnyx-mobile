import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { uuidV4 } from '@/src/features/roam/recordingStore';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { DietLogItem, Food, MealSlot, RecentFood } from '@/src/lib/api/diet';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { saveMealLog } from '../data/dietLogs';
import { fmt, foodLogItem, itemsTotal, SLOT_LABELS, SLOTS, slotForHour } from '../model';
import { Segments } from '../ui/Segments';
import { FoodRow } from './FoodRow';
import { QuickAdd } from './QuickAdd';
import { useFoodSearch } from './useFoodSearch';

type Picked = Map<string, { food: Food | RecentFood; qty: number }>;
const keyOf = (f: Food | RecentFood) => `${f.name.toLowerCase()}|${f.portion_label.toLowerCase()}`;

export function LogFoodScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const bottomSpace = useBottomBarSpace();
  const params = useLocalSearchParams<{ date?: string; slot?: MealSlot; q?: string }>();
  const date = params.date ?? localDateKey(new Date());
  const [slot, setSlot] = useState<MealSlot>(params.slot && SLOTS.includes(params.slot) ? params.slot : slotForHour(new Date().getHours()));
  const [query, setQuery] = useState(params.q ?? '');
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState<Picked>(new Map());
  const [saving, setSaving] = useState(false);
  const { recent, results, searching, offline } = useFoodSearch(user?.id, date, query);

  const searchMode = query.trim().length >= 2;
  const list: (Food | RecentFood)[] = useMemo(() => {
    if (searchMode) return results;
    return tab === 1 ? [...recent].sort((a, b) => b.count - a.count) : recent;
  }, [searchMode, results, recent, tab]);
  const items: DietLogItem[] = [...picked.values()].map(({ food, qty }) => foodLogItem(food, qty));
  const total = itemsTotal(items);

  const toggle = (f: Food | RecentFood) => setPicked((prev) => {
    const next = new Map(prev);
    if (next.has(keyOf(f))) next.delete(keyOf(f)); else next.set(keyOf(f), { food: f, qty: 1 });
    return next;
  });
  const setQty = (f: Food | RecentFood, qty: number) => setPicked((prev) => new Map(prev).set(keyOf(f), { food: f, qty }));

  const save = async (logItems: DietLogItem[], name: string, source: 'food' | 'quick') => {
    setSaving(true);
    try {
      await saveMealLog({ client_log_id: uuidV4(), local_date: date, slot, source, name: name.slice(0, 120), items: logItems });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save that', (e as Error)?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const quickAdd = (name: string, kcal: number, protein: number) => save([{
    food_id: null, name, portion_label: '', qty: 1, kcal, protein_g: protein, carbs_g: 0, fat_g: 0, is_veg: null,
  }], name, 'quick');

  const empty = searchMode
    ? (searching ? null : offline ? 'Search needs a connection. Your recent foods work offline.' : 'No match. Try a shorter word, or quick-add the calories.')
    : 'Foods you log show up here, so the next time is one tap.';

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Log food" subtitle={date === localDateKey(new Date()) ? 'Today' : date} onBack={() => router.back()} backLabel="Close" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
        <View style={styles.slots} accessibilityRole="radiogroup" accessibilityLabel="Add to">
          {SLOTS.map((s) => {
            const on = s === slot;
            return (
              <Pressable key={s} onPress={() => setSlot(s)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={[styles.slot, { backgroundColor: on ? c.text : c.card, borderColor: on ? c.text : c.border }]}>
                <Text style={[styles.slotText, { color: on ? c.background : c.text }]}>{SLOT_LABELS[s]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={20} color={c.mutedText} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search foods — try “dal” or “poha”" placeholderTextColor={c.mutedText}
            accessibilityLabel="Search foods" returnKeyType="search" autoCorrect={false} style={[styles.input, { color: c.text }]} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}><X size={18} color={c.mutedText} /></Pressable> : null}
        </View>
        {!searchMode ? <Segments options={['Recent', 'Frequent']} selected={tab} onSelect={setTab} /> : null}
        {searching && !list.length ? <ActivityIndicator color={c.primary} style={styles.loader} /> : null}
        {list.length ? (
          <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
            {list.map((f, i) => (
              <FoodRow key={keyOf(f)} food={f} first={i === 0} qty={picked.get(keyOf(f))?.qty ?? null} onToggle={() => toggle(f)} onQty={(q) => setQty(f, q)} />
            ))}
          </View>
        ) : empty ? <Text style={[styles.empty, { color: c.mutedText }]}>{empty}</Text> : null}
        <QuickAdd onAdd={quickAdd} />
      </ScrollView>
      <BottomBar>
        <Button title={items.length ? `Add ${items.length} item${items.length === 1 ? '' : 's'} · ${fmt(total.kcal)} kcal to ${SLOT_LABELS[slot]}` : 'Pick something to add'}
          disabled={!items.length} loading={saving} onPress={() => save(items, items.map((it) => it.name).join(', '), 'food')} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base + 4, paddingTop: spacing.sm, gap: spacing.base },
  slots: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontFamily: type.weight.semibold, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 52, paddingHorizontal: spacing.base, borderRadius: radii.lg, borderWidth: 1 },
  input: { flex: 1, minHeight: 48, fontFamily: type.weight.regular, fontSize: 16 },
  loader: { marginVertical: spacing.lg },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  empty: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: spacing.lg },
});
