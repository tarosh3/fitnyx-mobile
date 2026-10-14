import { useRouter } from 'expo-router';
import { ArrowUpRight, Play } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { agoLabel, fmtClock, partOf, plural, trackingOf } from '@/src/features/workouts/model';
import { isReady, startWorkout } from '@/src/features/workouts/start';
import { TrainingHeroCard as Hero } from '@/src/features/workouts/train/TrainingHeroCard';
import { Avatars } from '@/src/features/workouts/train/Avatars';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Routine } from '@/src/lib/api/routines';
import { useWorkout, useWorkoutTimer } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  routines: Routine[];
  trainedToday: boolean;
  program: { planId: string; dayId: string; title: string; dayName: string; exercises: number } | null;
  firstVisit: boolean;
  onError: (message: string) => void;
}

export function estMinutes(r: Pick<Routine, 'exercises'>): number {
  let min = 0;
  r.exercises.forEach((e) => {
    min += trackingOf(e.exercise) === 'cardio' ? (e.target_duration_sec ?? 1200) / 60 : (e.target_sets ?? 3) * 2.5;
  });
  return Math.max(5, Math.round(min / 5) * 5);
}

/** The single most useful next action: resume, today's program, a routine, or start fresh. */
export function TrainHero({ routines, trainedToday, program, firstVisit, onError }: Props) {
  const c = useThemeColors();
  const router = useRouter();
  const { activeSession, setActiveSession } = useWorkout();
  const { elapsedTime } = useWorkoutTimer();
  const [busy, setBusy] = useState(false);

  const go = async (planId?: string, dayId?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await startWorkout({ planId, dayId }, { router, setActiveSession });
    } catch {
      onError('We couldn’t start the workout. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const primary = (label: string, onPress: () => void, testID: string) => (
    <Pressable testID={testID} onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.primary, { backgroundColor: c.primary }, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator color={c.primaryText} /> : <><Play size={20} color={c.primaryText} fill={c.primaryText} /><Text style={[styles.primaryText, { color: c.primaryText }]}>{label}</Text></>}
    </Pressable>
  );
  const quiet = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.quiet}>
      <Text style={[styles.quietText, { color: c.hero.muted }]}>{label}</Text>
    </Pressable>
  );

  if (activeSession) {
    const state = isReady(activeSession) ? 'ready' : activeSession.status === 'paused' ? 'paused' : 'running';
    return (
      <Hero eyebrow={{ ready: 'Workout ready', paused: 'Workout paused', running: 'Workout in progress' }[state]}
        title="Your workout is open" subtitle={state === 'ready' ? 'Timer not started yet' : `${fmtClock(elapsedTime)}${state === 'paused' ? ' · paused' : ''}`}>
        {primary('Resume workout', () => router.push(`/workouts/session/${activeSession.id}`), 'hero-resume')}
      </Hero>
    );
  }
  if (firstVisit) {
    return (
      <Hero eyebrow="Your next chapter" title="Stronger starts here." subtitle="Your first workout. Your own pace.">
        {primary('Start a workout', () => go(), 'hero-start-empty')}
      </Hero>
    );
  }
  if (trainedToday) {
    return (
      <Hero recovered eyebrow="Today, accomplished" title={"Great work.\nRecovery counts."} subtitle="Take a breath. Come back stronger tomorrow.">
        <Pressable testID="hero-start-another" onPress={() => go()} disabled={busy} accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, { borderColor: c.hero.line, backgroundColor: c.hero.line }, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={c.hero.text} /> : <><Text style={[styles.primaryText, { color: c.hero.text }]}>Start another workout</Text><ArrowUpRight size={20} color={c.hero.accent} /></>}
        </Pressable>
      </Hero>
    );
  }
  if (program) {
    return (
      <Hero eyebrow={`Today · ${program.title}`} title={program.dayName} subtitle={plural(program.exercises, 'exercise')}>
        {primary('Start workout', () => go(program.planId, program.dayId), 'hero-start-program')}
        {quiet('See the exercises first', () => router.push(`/workouts/programs/${program.planId}`))}
      </Hero>
    );
  }
  // Suggest the routine done least recently (never-done first).
  const next = [...routines].sort((a, b) => (a.last_done ?? '').localeCompare(b.last_done ?? ''))[0];
  if (next) {
    return (
      <Hero eyebrow="Suggested for today" title={next.title} subtitle={next.last_done ? `Last done ${agoLabel(next.last_done)}` : 'Not done yet'}>
        <View style={styles.preview}>
          <Avatars items={next.exercises.map((e) => ({ part: partOf(e.exercise), tracking: trackingOf(e.exercise) }))} ring={c.hero.from} />
          <Text style={[styles.previewText, { color: c.hero.muted }]}>{plural(next.exercises.length, 'exercise')}{'\n'}about {estMinutes(next)} min</Text>
        </View>
        {primary(`Start ${next.title}`, () => go(next.id, next.day_id), 'hero-start-routine')}
        {quiet('See the exercises first', () => router.push(`/workouts/routine/${next.id}`))}
      </Hero>
    );
  }
  return (
    <Hero eyebrow="Make today count" title={"Your next rep\nstarts here."} subtitle="Build your workout as you go. Make it yours.">
      {primary('Start empty workout', () => go(), 'hero-start-empty')}
    </Hero>
  );
}

const styles = StyleSheet.create({
  primary: { minHeight: 56, borderRadius: radii.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primaryText: { flexShrink: 1, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 16 },
  secondary: { minHeight: 54, borderRadius: radii.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, borderWidth: 1 },
  quiet: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  quietText: { fontFamily: type.weight.semibold, fontSize: 15 },
  pressed: { transform: [{ scale: 0.97 }] },
  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewText: { fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 19 },
});
