import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, Utensils, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { uuidV4 } from '@/src/features/roam/recordingStore';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { DietLogItem, Food, MealSlot, RecentFood } from '@/src/lib/api/diet';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { saveMealLog } from '../data/dietLogs';
import { fmt, foodLogItem, itemsTotal, SLOT_LABELS, SLOTS, slotForHour } from '../model';
import { SectionTitle } from '../ui/bits';
import { Segments } from '../ui/Segments';
import { FoodRow } from './FoodRow';
import { QuickAdd } from './QuickAdd';
import { useFoodSearch } from './useFoodSearch';

type Picked = Map<string, { food: Food | RecentFood; qty: number }>;
const keyOf = (f: Food | RecentFood) => `${f.name.toLowerCase()}|${f.portion_label.toLowerCase()}`;

export function LogFoodScreen() {
  const c = useThemeColors();
  const toast = useToast();
  const { fontScale } = useWindowDimensions();
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
      toast((e as Error)?.message || 'Couldn’t save that. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const quickAdd = (name: string, kcal: number, protein: number) => save([{
    food_id: null, name, portion_label: '', qty: 1, kcal, protein_g: protein, carbs_g: 0, fat_g: 0, is_veg: null,
  }], name, 'quick');

  const available = list.filter((f) => !picked.has(keyOf(f)));
  const empty = searchMode
    ? (searching ? null : offline ? 'Search needs a connection. Your recent foods work offline.' : 'No match. Try a shorter word, or quick-add the calories.')
    : 'Foods you log show up here, so the next time is one tap.';

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Log food" subtitle={date === localDateKey(new Date()) ? 'Today' : date} onBack={() => router.back()} backLabel="Close" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: c.mutedText }]}>ADDING TO</Text>
        <View style={styles.slots} accessibilityRole="radiogroup" accessibilityLabel="Add to">
          {SLOTS.map((s) => {
            const on = s === slot;
            return (
              <Pressable key={s} onPress={() => setSlot(s)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={[styles.slot, fontScale > 1.2 && { flexBasis: '45%' }, { backgroundColor: on ? c.text : c.card, borderColor: on ? c.text : c.border }]}>
                <Text style={[styles.slotText, { color: on ? c.background : c.text }]}>{SLOT_LABELS[s]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={20} color={c.mutedText} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Find a food, e.g. dal or poha" placeholderTextColor={c.mutedText}
            accessibilityLabel="Search foods" returnKeyType="search" autoCorrect={false} style={[styles.input, { color: c.text }]} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}><X size={18} color={c.mutedText} /></Pressable> : null}
        </View>
        {picked.size ? <>
          <SectionTitle title="Your selection" note={`${fmt(total.kcal)} kcal`} />
          <View style={[styles.list, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
            {[...picked.values()].map(({ food, qty }, i) => <FoodRow key={keyOf(food)} food={food} first={i === 0} qty={qty} onToggle={() => toggle(food)} onQty={(q) => setQty(food, q)} />)}
          </View>
        </> : null}
        {!searchMode ? <Segments options={['Recent', 'Frequent']} selected={tab} onSelect={setTab} />
          : <SectionTitle title="Search results" note={searching ? 'Searching…' : `${available.length} available`} />}
        {searching && !list.length ? <ActivityIndicator color={c.primary} style={styles.loader} /> : null}
        {available.length ? (
          <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
            {available.map((f, i) => <FoodRow key={keyOf(f)} food={f} first={i === 0} qty={null} onToggle={() => toggle(f)} onQty={(q) => setQty(f, q)} />)}
          </View>
        ) : !list.length && empty ? <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
          <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}><Utensils size={26} color={c.accent} /></View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{searchMode ? 'Try another search' : 'Your favourites start here'}</Text>
          <Text style={[styles.empty, { color: c.mutedText }]}>{empty}</Text>
          {!searchMode ? <View style={styles.suggestions}>{['Dal', 'Roti', 'Paneer', 'Oats'].map((q) => <Pressable key={q} onPress={() => setQuery(q)} accessibilityRole="button" accessibilityLabel={`Search ${q}`} style={[styles.suggestion, { borderColor: c.border }]}>
            <Search size={13} color={c.accent} /><Text style={[styles.suggestionText, { color: c.text }]}>{q}</Text>
          </Pressable>)}</View> : null}
        </View> : null}
        <QuickAdd onAdd={quickAdd} busy={saving} />
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
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontFamily: type.weight.semibold, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 52, paddingHorizontal: spacing.base, borderRadius: radii.lg, borderWidth: 1 },
  input: { flex: 1, minHeight: 48, fontFamily: type.weight.regular, fontSize: 16 },
  loader: { marginVertical: spacing.lg },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.5, marginTop: 8, marginBottom: -8 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  emptyCard: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: type.weight.bold, fontSize: 18, textAlign: 'center' },
  empty: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  suggestion: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14 },
  suggestionText: { fontFamily: type.weight.semibold, fontSize: 13 },
});
