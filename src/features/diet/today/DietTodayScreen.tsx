import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { uuidV4 } from '@/src/features/roam/recordingStore';
import { BottomBar, Button, IconButton, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { DietLog } from '@/src/lib/api/diet';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing, type } from '@/src/styles/tokens';
import { useDietDay, useDietPlan, useDietSummary } from '../data/useDiet';
import { dateFromKey, dayStatus, fmt, goalsFromPlan, lastDays, loggedPlanMeals, nextMealIndex, planLogItem, planMeals, planProteinShortfall, sumLogs, type PlanMeal } from '../model';
import { InsightsPanel } from '../insights/InsightsPanel';
import { DietSetup } from '../setup/DietSetup';
import { SectionTitle } from '../ui/bits';
import { Segments } from '../ui/Segments';
import { MealCard } from './MealCard';
import { OtherLogs } from './OtherLogs';
import { SummaryCard } from './SummaryCard';
import { CoachTip, WaterCard } from './TodayCards';
import { WeekStrip } from './WeekStrip';

const shortDate = (d: string) => dateFromKey(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function DietTodayScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const today = localDateKey(new Date());
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === 'insights' ? 1 : 0);
  const [date, setDate] = useState(today);
  const [tipHidden, setTipHidden] = useState(false);
  const [removing, setRemoving] = useState<DietLog | null>(null);
  const bottomSpace = useBottomBarSpace();
  const { plan, state, reload, replace } = useDietPlan(user?.id);
  const day = useDietDay(user?.id, date);
  const week = lastDays(today, 7);
  const summary = useDietSummary(user?.id, week[0], today);

  const meals = useMemo(() => planMeals(plan), [plan]);
  const goal = goalsFromPlan(plan);
  const logged = loggedPlanMeals(day.logs);
  const eaten = sumLogs(day.logs);
  const next = date === today ? nextMealIndex(meals, logged) : null;
  const shortG = date === today && !tipHidden ? planProteinShortfall(meals, goal) : null;
  const stripDays = week.map((d) => {
    const t = summary.summary?.days.find((s) => s.date === d);
    return { date: d, status: dayStatus(t?.kcal ?? 0, t?.meals ?? 0, goal?.kcal ?? 0) };
  });

  const fail = (e: unknown) => Alert.alert('Couldn’t save that', (e as Error)?.message || 'Please try again.');
  const toggle = (meal: PlanMeal) => {
    const log = logged.get(meal.index);
    if (log) return day.remove(log.client_log_id).catch(fail);
    day.add({
      client_log_id: uuidV4(), local_date: date, slot: meal.slot, source: 'plan', plan_meal_index: meal.index,
      name: meal.title, items: [planLogItem(meal, 1)],
    }).catch(fail);
  };
  const openMeal = (meal: PlanMeal) => router.push({ pathname: '/diet/meal/[index]', params: { index: String(meal.index), date } });
  const openLog = (params: Record<string, string> = {}) => router.push({ pathname: '/diet/log', params: { date, ...params } });

  const header = (
    <TopBar title="Diet" subtitle={tab === 1 ? `Last 7 days · ${shortDate(week[0])} – ${shortDate(today)}`
      : date === today ? 'Today' : dateFromKey(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      right={state === 'ready' ? <IconButton label="Change diet plan" onPress={() => router.push('/diet/setup')}><SlidersHorizontal size={20} color={c.text} /></IconButton> : null} />
  );

  if (state !== 'ready' || !plan || !goal) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          {state === 'loading' ? <ActivityIndicator color={c.primary} style={styles.loader} />
            : state === 'offline' ? (
              <View style={styles.centered}>
                <Text style={[styles.offlineTitle, { color: c.text }]}>You’re offline</Text>
                <Text style={[styles.offlineText, { color: c.mutedText }]}>Your diet plan loads once you’re connected. After that, it stays available offline.</Text>
                <Button title="Try again" variant="secondary" onPress={reload} style={styles.retry} />
              </View>
            ) : user ? <DietSetup userId={user.id} onCreated={replace} /> : null}
        </ScrollView>
      </View>
    );
  }

  const others = day.logs.filter((l) => l.source !== 'plan');
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} showsVerticalScrollIndicator={false}>
        <WeekStrip days={stripDays} selected={tab === 0 ? date : ''} today={today} onSelect={(d) => { setDate(d); setTab(0); }} />
        <Segments options={['Today', 'Insights']} selected={tab} onSelect={setTab} />
        {tab === 1 ? <InsightsPanel summary={summary.summary} offline={summary.offline} goal={goal} today={today} /> : <>
          {day.offline ? <Text style={[styles.offlineNote, { color: c.mutedText }]}>Offline — showing what’s saved on this phone. New meals sync when you’re back online.</Text> : null}
          <SummaryCard eaten={eaten} goal={goal} />
          {shortG ? <CoachTip shortG={shortG} onAction={() => openLog({ slot: 'snack', q: 'greek yogurt' })} onDismiss={() => setTipHidden(true)} /> : null}
          {date === today ? <WaterCard /> : null}
          <SectionTitle title="Meals" note={`${fmt(meals.reduce((t, m) => t + m.macros.kcal, 0))} kcal planned`} />
          {meals.map((m) => (
            <MealCard key={m.index} meal={m} log={logged.get(m.index)} next={next === m.index} onToggle={() => toggle(m)} onOpen={() => openMeal(m)} />
          ))}
          {others.length ? <SectionTitle title="Other food" note={`${fmt(sumLogs(others).kcal)} kcal`} /> : null}
          <OtherLogs logs={others} onRemove={setRemoving} />
        </>}
      </ScrollView>
      <BottomBar>
        <Button title="Log food" icon={<Plus size={20} color={c.primaryText} strokeWidth={2.4} />} onPress={() => openLog()} />
      </BottomBar>
      <ConfirmModal visible={!!removing} title="Remove this food?" message={removing ? `${removing.name} · ${removing.kcal} kcal` : ''}
        confirmLabel="Remove" variant="danger" onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) day.remove(removing.client_log_id).catch(fail); setRemoving(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base + 4, paddingTop: spacing.sm, gap: spacing.base },
  loader: { marginTop: spacing['3xl'] },
  centered: { alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.sm },
  offlineTitle: { fontFamily: type.weight.extrabold, fontSize: 18 },
  offlineText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  retry: { flex: 0, alignSelf: 'stretch', marginTop: spacing.md },
  offlineNote: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
});
