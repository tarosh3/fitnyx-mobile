import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Play } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardPlan, DashboardPlanDay } from '@/src/lib/api/dashboard';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';
import { colors } from '@/src/theme/colors';

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
    : 'Find your\nstarting point.';
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
    : 'Choose a plan that fits your goals.';
  const action = hasSession ? 'Continue workout' : emptyDay ? 'Open plan' : hasPlan ? 'View workout' : 'Explore plans';
  const knownDayProgress = Boolean(displayedDay) && typeof currentDayIndex === 'number' && Number.isInteger(currentDayIndex) && currentDayIndex > 0 &&
    typeof totalDays === 'number' && Number.isInteger(totalDays) && totalDays >= currentDayIndex;
  const metadata = hasWorkout ? [
    knownExerciseCount ? `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` : null,
    knownDayProgress ? `Day ${currentDayIndex} of ${totalDays}` : null,
  ].filter(Boolean).join('  ·  ') : '';

  const handlePress = () => {
    if (activeSession?.id) router.push(`/workouts/session/${activeSession.id}`);
    else if (activePlan?.id) router.push(`/workouts/plans/${activePlan.id}`);
    else router.push('/workouts/select');
  };

  return (
    <Pressable
      testID="home-workout-card"
      accessibilityRole="button"
      accessibilityLabel={`${action}. ${title.replace(/\n/g, ' ')}${metadata ? `. ${metadata}` : ''}`}
      accessibilityHint={hasSession ? 'Opens your current workout session.' : hasPlan ? 'Opens the plan so you can review your workout.' : 'Browse available workout plans.'}
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image
        source={require('../../../../assets/images/home-workout-hero.jpg')}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
        accessible={false}
        importantForAccessibility="no"
      />
      <LinearGradient
        colors={['rgba(7, 11, 9, 0.68)', 'rgba(7, 11, 9, 0.28)', 'rgba(7, 11, 9, 0.88)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{hasSession ? 'SESSION IN PROGRESS' : 'UP NEXT'}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.footer}>
          {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
          <View style={styles.action}>
            {hasSession ? <Play size={17} color={colors.dark.primaryText} fill={colors.dark.primaryText} /> : null}
            <Text style={styles.actionText}>{action}</Text>
            {!hasSession ? <ArrowRight size={19} color={colors.dark.primaryText} /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 280,
    backgroundColor: colors.dark.surface,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
  },
  pressed: { opacity: 0.88 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  heading: { gap: spacing.sm },
  eyebrow: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.xs,
    lineHeight: 18,
    letterSpacing: type.tracking.eyebrow,
    color: colors.dark.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: type.weight.bold,
    fontSize: type.size.h1,
    lineHeight: 39,
    letterSpacing: -0.8,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: type.weight.regular,
    fontSize: type.size.sm,
    lineHeight: 21,
    color: '#DEDFDE',
  },
  footer: { gap: spacing.base },
  metadata: {
    fontFamily: type.weight.medium,
    fontSize: type.size.xs,
    lineHeight: 19,
    color: '#DEDFDE',
  },
  action: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.dark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionText: {
    fontFamily: type.weight.bold,
    fontSize: type.size.sm,
    lineHeight: 22,
    color: colors.dark.primaryText,
    flexShrink: 1,
  },
});
