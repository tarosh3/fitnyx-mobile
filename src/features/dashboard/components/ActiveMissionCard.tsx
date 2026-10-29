import { useRouter } from 'expo-router';
import { ArrowUpRight, ChevronRight, Dumbbell, Play } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardPlan, DashboardPlanDay } from '@/src/lib/api/dashboard';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { HomePressable } from './HomePressable';
import { startWorkout } from '@/src/features/workouts/start';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { haptic } from '@/src/lib/haptics';

interface ActiveMissionCardProps {
  activePlan: DashboardPlan | null;
  activeSession: WorkoutSession | null;
  currentDay: DashboardPlanDay | null;
  nextExercisesCount?: number;
  currentDayIndex?: number;
  totalDays?: number;
}

export function ActiveMissionCard({
  activePlan,
  activeSession,
  currentDay,
  nextExercisesCount,
  currentDayIndex,
  totalDays,
}: ActiveMissionCardProps) {
  const router = useRouter();
  const c = useThemeColors();
  const { setActiveSession } = useWorkout();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const hasSession = Boolean(activeSession?.id);
  const hasPlan = Boolean(activePlan?.id);
  const hasWorkout = hasSession || hasPlan;
  // Dashboard details describe the upcoming workout, which can differ from
  // the session being resumed (for example, after changing the active plan).
  const planMatchesSession = !hasSession || Boolean(activeSession?.plan_id && activeSession.plan_id === activePlan?.id);
  const dayMatchesSession = !hasSession || Boolean(planMatchesSession && activeSession?.day_id && activeSession.day_id === currentDay?.id);
  const displayedPlan = planMatchesSession ? activePlan : null;
  const displayedDay = hasPlan && dayMatchesSession ? currentDay : null;
  const title = hasWorkout
    ? displayedDay?.day_name?.trim() || displayedPlan?.title?.trim() || 'Your workout'
    : 'Ready to move?';
  const planTitle = displayedPlan?.title?.trim();
  // A missing day is normalized to nextExercisesCount=0 by the metrics hook;
  // don't display that placeholder as a known empty workout.
  const exerciseCount = displayedDay
    ? displayedDay.exercise_count ?? nextExercisesCount
    : !hasSession && hasPlan && typeof nextExercisesCount === 'number' && nextExercisesCount > 0 ? nextExercisesCount : undefined;
  const knownExerciseCount = typeof exerciseCount === 'number' && Number.isInteger(exerciseCount) && exerciseCount > 0;
  // Today's plan day has no exercises yet: say so, rather than "all laid out".
  const emptyDay = !hasSession && Boolean(displayedDay) && exerciseCount === 0;
  const subtitle = hasWorkout
    ? emptyDay
      ? 'No exercises on this day yet. Add some to your plan.'
      : planTitle && planTitle !== title ? planTitle : hasSession ? 'Your session is ready when you are.' : 'Your next session, all laid out.'
    : 'Build your workout as you go.';
  const canStart = !hasSession && (!hasPlan || Boolean(displayedDay?.id && knownExerciseCount));
  const action = hasSession ? 'Continue workout' : canStart ? 'Start workout' : emptyDay ? 'Open plan' : 'View workout';
  const knownDayProgress = Boolean(displayedDay) && typeof currentDayIndex === 'number' && Number.isInteger(currentDayIndex) && currentDayIndex > 0 &&
    typeof totalDays === 'number' && Number.isInteger(totalDays) && totalDays >= currentDayIndex;
  const metadata = hasWorkout ? [
    knownExerciseCount ? `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` : null,
    knownDayProgress ? `Day ${currentDayIndex} of ${totalDays}` : null,
  ].filter(Boolean).join('  ·  ') : '';

  const handlePress = async () => {
    if (busy) return;
    if (activeSession?.id) router.push(`/workouts/session/${activeSession.id}`);
    else if (canStart) {
      setBusy(true);
      setError(false);
      try {
        await startWorkout({ planId: activePlan?.id, dayId: displayedDay?.id }, { router, setActiveSession });
        haptic.light();
      } catch { setError(true); }
      finally { setBusy(false); }
    } else if (activePlan?.id) router.push(`/workouts/programs/${activePlan.id}`);
    else router.push('/plan');
  };

  return (
    <View>
      <HomePressable
        testID="home-workout-card"
        accessibilityRole="button"
        accessibilityLabel={`${action}. ${title.replace(/\n/g, ' ')}${metadata ? `. ${metadata}` : ''}`}
        accessibilityHint={hasSession ? 'Opens your current workout session.' : canStart ? 'Prepares your workout in the logger. The timer starts when you are ready.' : 'Opens the plan so you can review your workout.'}
        disabled={busy}
        accessibilityState={{ busy, disabled: busy }}
        onPress={handlePress}
        style={[styles.card, { backgroundColor: c.accentSoft }]}
      >
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
          {hasSession ? <Play size={18} color={c.accent} fill={c.accent} /> : <Dumbbell size={22} strokeWidth={1.7} color={c.accent} />}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: hasSession ? c.accent : c.mutedText }]}>{hasSession ? 'SESSION IN PROGRESS' : 'UP NEXT'}</Text>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>{subtitle}</Text>
          <View style={styles.footer}>
            {metadata ? <Text style={[styles.metadata, { color: c.mutedText }]}>{metadata}</Text> : null}
            <View style={styles.action}><Text style={[styles.actionText, { color: c.accent }]}>{busy ? 'Preparing workout…' : action}</Text>{busy ? <ActivityIndicator size="small" color={c.accent} /> : <ArrowUpRight size={16} color={c.accent} />}</View>
          </View>
        </View>
      </HomePressable>
      {error && <Text accessibilityRole="alert" style={[styles.subtitle, { color: c.destructive, marginTop: spacing.sm }]}>Couldn’t start your workout. Tap Start workout to try again.</Text>}
      {!hasSession && <Pressable accessibilityRole="button" onPress={() => router.push(activePlan?.id ? `/workouts/programs/${activePlan.id}` : '/plan')}
        style={({ pressed }) => [styles.planLink, { backgroundColor: c.card, opacity: pressed ? 0.75 : 1 }]}>
        <Text style={[styles.actionText, { color: c.accent }]}>{hasPlan ? 'Review your plan' : 'See your starter plan'}</Text>
        <ChevronRight size={18} color={c.accent} />
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radii.lg, padding: spacing.base },
  icon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.micro, lineHeight: 16, letterSpacing: 1.1 },
  title: { fontFamily: type.weight.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  subtitle: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: 3 },
  metadata: { fontFamily: type.weight.medium, fontSize: type.size.xs, lineHeight: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  planLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.base, marginTop: spacing.sm, borderRadius: radii.md },
});
