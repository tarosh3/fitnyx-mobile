import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uuidV4 } from '@/src/features/roam/recordingStore';
import { BottomBar, Button, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useDietDay, useDietPlan } from '../data/useDiet';
import { fmt, goalsFromPlan, loggedPlanMeals, planLogItem, planMeals, scaleMacros, SLOT_LABELS, sumLogs } from '../model';
import { SectionTitle, VegMark } from '../ui/bits';
import { AfterThis, Ingredients, PORTIONS, PortionStepper, Steps, SwapOptions } from './DetailParts';
import { MacroPlate } from './MacroPlate';

export function MealDetailScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSpace = useBottomBarSpace();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ index: string; date?: string }>();
  const date = params.date ?? localDateKey(new Date());
  const { plan, state } = useDietPlan(user?.id);
  const day = useDietDay(user?.id, date);
  const meal = useMemo(() => planMeals(plan)[Number(params.index)], [plan, params.index]);
  const log = meal ? loggedPlanMeals(day.logs).get(meal.index) : undefined;
  const [portion, setPortion] = useState(1);
  const [swap, setSwap] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Open on what was actually logged (portion, swap) so it can be changed.
  useEffect(() => {
    if (!log || !meal) return;
    const qty = log.items[0]?.qty ?? 1;
    setPortion(PORTIONS.includes(qty) ? qty : 1);
    const alt = meal.alternatives.findIndex((a) => a.title === log.name);
    setSwap(alt >= 0 ? alt : null);
  }, [log?.client_log_id, meal]);

  if (state === 'loading' || !meal) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        {state === 'loading' ? <ActivityIndicator color={c.primary} /> : <Text style={[styles.muted, { color: c.mutedText }]}>This meal isn’t in your plan any more.</Text>}
      </View>
    );
  }

  const alt = swap !== null ? meal.alternatives[swap] : undefined;
  const macros = scaleMacros(alt?.macros ?? meal.macros, portion);
  const goal = goalsFromPlan(plan);
  const others = sumLogs(day.logs.filter((l) => l !== log));
  const changed = !!log && (log.name !== (alt?.title ?? meal.title) || (log.items[0]?.qty ?? 1) !== portion);

  const save = async () => {
    setSaving(true);
    try {
      if (log) await day.remove(log.client_log_id);
      await day.add({
        client_log_id: uuidV4(), local_date: date, slot: meal.slot, source: 'plan', plan_meal_index: meal.index,
        name: alt?.title ?? meal.title, items: [planLogItem(meal, portion, alt)],
      });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save that', (e as Error)?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const undo = () => log && day.remove(log.client_log_id).then(() => router.back()).catch((e) => Alert.alert('Couldn’t remove that', (e as Error)?.message || 'Please try again.'));

  const cta = log
    ? (changed ? 'Save changes' : 'Logged')
    : alt ? `Swap to ${alt.title}` : `I ate this · ${fmt(macros.kcal)} kcal`;

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: c.diet.hero, paddingTop: insets.top + spacing['3xl'] }]}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}
            style={({ pressed }) => [styles.back, { top: insets.top + spacing.sm, backgroundColor: c.card }, pressed && { opacity: 0.7 }]}>
            <ChevronLeft size={24} color={c.text} />
          </Pressable>
          <MacroPlate macros={macros} />
        </View>
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <View style={styles.titleBlock}>
            <View style={styles.meta}>
              <Text style={[styles.slotPill, { color: c.diet.slots[meal.slot].fg, backgroundColor: c.diet.slots[meal.slot].bg }]}>
                {meal.label || SLOT_LABELS[meal.slot]}{meal.time ? ` · ${meal.time}` : ''}
              </Text>
              <VegMark veg={alt ? alt.veg : meal.veg} />
            </View>
            <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{alt?.title ?? meal.title}</Text>
            {alt ? <Text style={[styles.muted, { color: c.mutedText }]}>Instead of the planned {meal.title}</Text> : null}
          </View>
          <PortionStepper portion={portion} onChange={setPortion} />
          {goal && date === localDateKey(new Date()) ? <AfterThis kcal={goal.kcal - others.kcal - macros.kcal} protein={goal.protein - others.protein - macros.protein} /> : null}
          {alt ? (alt.desc ? <><SectionTitle title="What’s in it" /><Text style={[styles.body, { color: c.text }]}>{alt.desc}</Text></> : null) : (
            <>
              <SectionTitle title={meal.ingredients.length ? 'Ingredients' : 'What’s in it'} note={portion !== 1 ? `${portion}× portion` : undefined} />
              <Ingredients meal={meal} portion={portion} />
            </>
          )}
          {meal.alternatives.length ? <><SectionTitle title="Swap for something similar" /><SwapOptions meal={meal} selected={swap} onSelect={setSwap} /></> : null}
          {!alt && meal.steps.length ? <><SectionTitle title="How to make it" /><Steps steps={meal.steps} /></> : null}
        </View>
      </ScrollView>
      <BottomBar>
        {log ? <Button title="Undo" variant="secondary" onPress={undo} style={styles.undo} /> : null}
        <Button title={cta} onPress={save} loading={saving} disabled={!!log && !changed} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  hero: { alignItems: 'center', paddingBottom: spacing['2xl'] + spacing.xl },
  back: { position: 'absolute', left: spacing.base, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -spacing.xl, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  titleBlock: { gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotPill: { fontFamily: type.weight.bold, fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, overflow: 'hidden' },
  title: { fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  muted: { fontFamily: type.weight.regular, fontSize: 14 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  undo: { flex: 0, paddingHorizontal: spacing.xl },
});
