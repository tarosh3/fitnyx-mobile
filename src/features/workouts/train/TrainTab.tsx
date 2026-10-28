import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { Entrance } from '@/src/components/ui/Motion';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fmtVolume, plural } from '@/src/features/workouts/model';
import { ProgramCard } from '@/src/features/workouts/programs/ProgramCard';
import { startWorkout } from '@/src/features/workouts/start';
import { TrainHero } from '@/src/features/workouts/train/TrainHero';
import { Challenges, FirstVisitChoices, QuickStart, RecentRow, RoutineList } from '@/src/features/workouts/train/TrainSections';
import { StarterCard } from '@/src/features/workouts/train/StarterCard';
import { WeekCard } from '@/src/features/workouts/train/WeekCard';
import { SectionHead } from '@/src/features/workouts/ui/bits';
import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { usePrograms, useRoutines } from '@/src/features/workouts/hooks';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Routine } from '@/src/lib/api/routines';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

export function TrainTab({ userId, onSeeHistory }: { userId: string; onSeeHistory: () => void }) {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const metrics = useRetentionMetrics(userId);
  const routines = useRoutines();
  const programs = usePrograms();
  const { activeSession, setActiveSession } = useWorkout();
  const [cardioOpen, setCardioOpen] = useState(false);

  const sessions = metrics.sessions ?? [];
  const today = localDateKey(new Date());
  const month = today.slice(0, 7);
  const list = routines.data ?? [];
  const firstVisit = !routines.loading && list.length === 0 && sessions.length === 0 && !metrics.activePlan;

  const start = async (planId?: string, dayId?: string) => {
    try {
      await startWorkout({ planId, dayId }, { router, setActiveSession });
    } catch {
      toast('We couldn’t start the workout. Check your connection and try again.', 'error');
    }
  };
  const startRoutine = (r: Routine) => {
    if (activeSession) return router.push(`/workouts/session/${activeSession.id}`);
    start(r.id, r.day_id);
  };

  if (!activeSession && (metrics.loading || routines.loading) && !sessions.length && !list.length) {
    return <><ContentSkeleton label="Loading your next workout" /><ContentSkeleton variant="list" label="Loading routines" /></>;
  }

  return (
    <View>
      <Entrance style={styles.gapTop}>
        <TrainHero
          routines={list}
          trainedToday={sessions.some((s) => s.workout_date === today)}
          firstVisit={firstVisit}
          program={metrics.activePlan && metrics.currentDay ? {
            planId: metrics.activePlan.id, dayId: metrics.currentDay.id, title: metrics.activePlan.title,
            dayName: metrics.currentDay.day_name || `Day ${metrics.currentDay.day_index}`, exercises: metrics.currentDay.exercise_count,
          } : null}
          onError={toast}
        />
      </Entrance>
      <View style={styles.gapTop}>
        <WeekCard sessions={sessions} />
      </View>
      {!metrics.loading && !metrics.activePlan ? (
        <View style={styles.gapTop}>
          <StarterCard />
        </View>
      ) : null}

      {firstVisit ? (
        <FirstVisitChoices onEmpty={() => start()} />
      ) : (
        <>
          <QuickStart onEmpty={() => (activeSession ? router.push(`/workouts/session/${activeSession.id}`) : start())} onCardio={() => setCardioOpen(true)} />
          <Challenges
            monthWorkouts={new Set(sessions.filter((s) => s.workout_date.startsWith(month)).map((s) => s.workout_date)).size}
            streak={metrics.streakDays}
            level={metrics.level}
            levelProgress={metrics.levelProgress}
            xpToNext={Math.max(0, metrics.nextLevelXp - metrics.xp)}
          />
          <RoutineList routines={list} onStart={startRoutine} />
          {sessions.length ? (
            <View style={styles.section}>
              <SectionHead title="Recent workouts" right={
                <Pressable onPress={onSeeHistory} accessibilityRole="button" style={styles.link}>
                  <Text style={[styles.linkText, { color: c.accent }]}>See all</Text><ChevronRight size={18} color={c.accent} />
                </Pressable>} />
              <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
                {sessions.slice(0, 3).map((s, i) => (
                  <View key={s.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border } : null}>
                    <RecentRow item={{
                      id: s.id, title: s.plan_name || 'Workout', date: s.workout_date, minutes: Math.max(1, Math.round(s.total_duration_sec / 60)),
                      detail: s.total_volume_kg > 0 ? `${fmtVolume(s.total_volume_kg)} kg lifted` : plural(s.total_sets, 'set'),
                    }} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {programs.data?.length ? (
            <View style={styles.section}>
              <SectionHead title="Programs for you" right={
                <Pressable onPress={() => router.push('/workouts/programs')} accessibilityRole="button" style={styles.link}>
                  <Text style={[styles.linkText, { color: c.accent }]}>Explore all</Text><ChevronRight size={18} color={c.accent} />
                </Pressable>} />
              {programs.data.slice(0, 2).map((p) => <ProgramCard key={p.id} program={p} active={metrics.activePlan?.title === p.title} />)}
            </View>
          ) : null}
        </>
      )}

      <ExercisePicker
        visible={cardioOpen}
        onClose={() => setCardioOpen(false)}
        mode="single"
        title="Choose your cardio"
        subtitle="Running or walking outside? Use Roam on Home."
        initialPart="cardio"
        emptyLabel="Tap a machine to choose it"
        confirmLabel={(p) => `Start ${p[0].title}`}
        onConfirm={(p) => {
          setCardioOpen(false);
          // Starts an empty workout; the logger opens with the picked machine added.
          startWorkout({}, { router, setActiveSession }, { addExerciseUuid: p[0].uuid })
            .catch(() => toast('We couldn’t start the workout. Check your connection and try again.', 'error'));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gapTop: { marginTop: spacing.base },
  section: { gap: spacing.md, marginTop: spacing['2xl'] - 4 },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 2 },
  linkText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
