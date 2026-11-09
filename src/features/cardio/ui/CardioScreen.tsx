import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Footprints, Play, Timer } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Machine, machineForExercise, MACHINES } from '@/src/features/cardio/machines';
import { type Goal, GOALS, LENGTHS, minutesOf, type Program, type ProgramLength, phasesOf, PROGRAMS, suggestedGoal } from '@/src/features/cardio/programs';
import { useProGate } from '@/src/features/pro/gate';
import { cardioIsFree } from '@/src/features/pro/model';
import { ProTag } from '@/src/features/pro/ProTag';
import { beginRun } from '@/src/features/cardio/start';
import { runIsOrphaned } from '@/src/features/cardio/finish';
import { clearRun, comfortFor, lastMachine, loadComfort, loadHistory, loadRun, type RunRecord, type RunState, timesDone } from '@/src/features/cardio/store';
import { PhaseGraph } from '@/src/features/cardio/ui/PhaseGraph';
import { usePlan } from '@/src/features/plan/data';
import { startWorkout } from '@/src/features/workouts/start';
import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { StepperSheet, type StepField } from '@/src/features/workouts/ui/StepperSheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExerciseWithCache } from '@/src/lib/offline/exerciseCache';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

type ComfortStore = Awaited<ReturnType<typeof loadComfort>>;

const dialField = (key: string, dial: NonNullable<Machine['secondary']>, value: number, floor: number): StepField => ({
  key, label: `Comfortable ${dial.label.toLowerCase()}`, hint: dial.unit,
  value, step: dial.step, min: floor, max: dial.max, decimals: 1,
});

/** Pick a guided program by what you want from today. Warm-ups, fat loss, stamina, speed, hills. */
export function CardioScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const params = useLocalSearchParams<{ exercise?: string; sets?: string }>();
  const { activeSession, loading: workoutLoading, setActiveSession, resumeActiveSession } = useWorkout();
  const { isOffline } = useOfflineAware();
  const profileGoal = usePlan().data?.profile?.goal;

  const [comfort, setComfort] = useState<ComfortStore>({ byMachine: {} });
  const [machine, setMachine] = useState<Machine>(MACHINES[0]);
  /** Started from a cardio exercise in the logger: that's the machine, and what the run logs against. */
  const [fixedExercise, setFixedExercise] = useState<string | null>(null);
  const inWorkout = !!activeSession && ['in_progress', 'paused'].includes(activeSession.status);
  const [goal, setGoal] = useState<Goal>(() => suggestedGoal({ inWorkout, setsLogged: Number(params.sets ?? 0), profileGoal }));
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [resume, setResume] = useState<RunState | null>(null);
  const [setup, setSetup] = useState<Program | null>(null);
  const [length, setLength] = useState<ProgramLength>('standard');
  const [decline, setDecline] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const store = await loadComfort(userId);
      if (!alive) return;
      setComfort(store);
      if (params.exercise) {
        const ex = await fetchExerciseWithCache(params.exercise).catch(() => null);
        const m = machineForExercise(ex);
        if (m && alive) { setMachine(m); setFixedExercise(params.exercise); return; }
      }
      if (alive) setMachine(lastMachine(store));
    })().catch(() => undefined);
    return () => { alive = false; };
  }, [userId, params.exercise]);

  // Coming back from a run: it may have ended, and there's a new one to count.
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    loadHistory(userId).then(setHistory).catch(() => undefined);
    loadRun(userId).then(setResume).catch(() => undefined);
    loadComfort(userId).then(setComfort).catch(() => undefined);
  }, [userId]));

  const list = useMemo(() => PROGRAMS.filter((p) => p.goal === goal && (!p.treadmillOnly || machine.id === 'treadmill')), [goal, machine.id]);
  const saved = comfortFor(comfort, machine);
  const proGate = useProGate();

  // Its workout was finished from somewhere else (a notification): nothing left to save it to.
  useEffect(() => {
    if (!userId || !runIsOrphaned(resume, { hasOpenWorkout: inWorkout, workoutLoading, offline: isOffline })) return;
    setResume(null);
    clearRun(userId).catch(() => undefined);
  }, [userId, resume, inWorkout, workoutLoading, isOffline]);

  const open = (p: Program) => {
    // Three programs are free; the rest are Pro.
    if (!cardioIsFree(p.id) && !proGate.isPro) return proGate.openPro();
    // One run at a time: starting another would throw this one away.
    if (resume) {
      toast(`${resume.programTitle} is still going. Finish it first`);
      router.push('/cardio/live');
      return;
    }
    setLength('standard');
    setDecline(saved.decline);
    setSetup(p);
  };

  const start = async (values: Record<string, number>) => {
    if (!setup || starting) return;
    setStarting(true);
    try {
      await beginRun({
        userId, program: setup, machine, exerciseUuid: fixedExercise ?? machine.exerciseUuid, length, voice: true,
        comfort: { primary: values.primary ?? saved.primary, secondary: values.secondary ?? saved.secondary, decline },
        activeSession: inWorkout ? activeSession : null, setActiveSession, resumeActiveSession,
      });
      setSetup(null);
      router.push('/cardio/live');
    } catch {
      toast('We couldn’t start the program. Check your connection and try again.', 'error');
    } finally {
      setStarting(false);
    }
  };

  /** No program: the machine goes straight into the logger, with a timer on its row. */
  const freeRun = () => {
    if (inWorkout) { router.push(`/workouts/session/${activeSession!.id}?add=${fixedExercise ?? machine.exerciseUuid}`); return; }
    startWorkout({}, { router, setActiveSession }, { addExerciseUuid: machine.exerciseUuid })
      .catch(() => toast('We couldn’t start the workout. Check your connection and try again.', 'error'));
  };

  const hasDownhill = !!setup && machine.id === 'treadmill' && phasesOf(setup, 'long').some((p) => (p.climb ?? 0) < 0);
  const fields: StepField[] = !setup ? [] : [
    dialField('primary', machine.primary, saved.primary, machine.primary.min),
    ...(machine.secondary ? [dialField('secondary', machine.secondary, saved.secondary, Math.max(0, machine.secondary.min))] : []),
  ];

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Cardio" subtitle={inWorkout ? 'Adds to the workout you have open' : 'Guided programs, called out live'} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {resume ? (
          <Pressable testID="cardio-resume" onPress={() => router.push('/cardio/live')} accessibilityRole="button"
            style={({ pressed }) => [styles.resume, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.8 }]}>
            <Play size={20} color={c.accent} fill={c.accent} />
            <View style={styles.grow}>
              <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>{resume.programTitle}</Text>
              <Text style={[styles.meta, { color: c.mutedText }]}>{resume.finished ? 'Finished. Save it' : 'In progress. Back to it'}</Text>
            </View>
            <ChevronRight size={20} color={c.accent} />
          </Pressable>
        ) : null}

        {fixedExercise ? null : (
          <>
            <Text style={[styles.label, { color: c.mutedText }]}>Machine</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
              {MACHINES.map((m) => {
                const on = m.id === machine.id;
                return (
                  <Pressable key={m.id} testID={`machine-${m.id}`} onPress={() => setMachine(m)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={[styles.chip, { borderColor: on ? c.text : c.border, backgroundColor: on ? c.text : c.card }]}>
                    <Text style={[styles.chipText, { color: on ? c.background : c.text }]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={[styles.label, { color: c.mutedText }]}>What do you want today?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          {GOALS.map((g) => {
            const on = g.key === goal;
            return (
              <Pressable key={g.key} testID={`goal-${g.key}`} onPress={() => setGoal(g.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={[styles.chip, { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentSoft : c.card }]}>
                <Text style={[styles.chipText, { color: on ? c.accent : c.text }]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.cards}>
          {list.map((p) => {
            const done = timesDone(history, p.id);
            return (
              <Pressable key={p.id} testID={`program-${p.id}`} onPress={() => open(p)} accessibilityRole="button"
                accessibilityLabel={`${p.title}. ${minutesOf(p, 'standard')} minutes. ${p.level}. ${p.blurb}`}
                style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
                <View style={styles.cardHead}>
                  <Text style={[styles.cardTitle, styles.grow, { color: c.text }]} numberOfLines={1}>{p.title}</Text>
                  {proGate.locked && !cardioIsFree(p.id) ? <ProTag /> : null}
                  <ChevronRight size={20} color={c.mutedText} />
                </View>
                <Text style={[styles.blurb, { color: c.mutedText }]}>{p.blurb}</Text>
                <PhaseGraph phases={phasesOf(p, 'standard')} height={44} />
                <Text style={[styles.meta, { color: c.mutedText }]}>
                  {minutesOf(p, 'standard')} min · {p.level}{done ? ` · Done ${done}×` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable testID="cardio-free" onPress={freeRun} accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.8 }]}>
          <Timer size={20} color={c.text} />
          <View style={styles.grow}>
            <Text style={[styles.rowTitle, { color: c.text }]}>No program, just track it</Text>
            <Text style={[styles.meta, { color: c.mutedText }]}>Timer and distance on your {machine.label.toLowerCase()}</Text>
          </View>
          <ChevronRight size={20} color={c.mutedText} />
        </Pressable>
        <Pressable testID="cardio-roam" onPress={() => router.push('/roam')} accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.8 }]}>
          <Footprints size={20} color={c.text} />
          <View style={styles.grow}>
            <Text style={[styles.rowTitle, { color: c.text }]}>Going outside?</Text>
            <Text style={[styles.meta, { color: c.mutedText }]}>Roam tracks your run, walk or ride on a map</Text>
          </View>
          <ChevronRight size={20} color={c.mutedText} />
        </Pressable>
      </ScrollView>

      <StepperSheet visible={!!setup} title={setup?.title ?? ''} subtitle={`${machine.label} · What you could hold for 20 min`} fields={fields}
        saveLabel={starting ? 'Starting…' : 'Start program'} onClose={() => setSetup(null)} onSave={start}>
        <View style={styles.setup}>
          <Text style={[styles.setupLabel, { color: c.text }]}>How long?</Text>
          <View style={styles.lengths}>
            {setup ? LENGTHS.map((l) => {
              const on = l.key === length;
              return (
                <Pressable key={l.key} testID={`length-${l.key}`} onPress={() => setLength(l.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  style={[styles.length, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.accentSoft : c.surface }]}>
                  <Text style={[styles.lengthName, { color: on ? c.accent : c.text }]}>{l.label}</Text>
                  <Text style={[styles.meta, { color: c.mutedText }]}>{minutesOf(setup, l.key)} min</Text>
                </Pressable>
              );
            }) : null}
          </View>
          {hasDownhill ? (
            <View style={styles.declineRow}>
              <View style={styles.grow}>
                <Text style={[styles.setupLabel, { color: c.text }]}>My treadmill can go downhill</Text>
                <Text style={[styles.meta, { color: c.mutedText }]}>Off: downhill steps stop at 0%</Text>
              </View>
              <Switch testID="cardio-decline" value={decline} onValueChange={setDecline} trackColor={{ true: c.primary, false: c.switchTrack }} accessibilityLabel="My treadmill can go downhill" />
            </View>
          ) : null}
        </View>
      </StepperSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: spacing.md },
  label: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: -4 },
  bleed: { marginHorizontal: -spacing.base, flexGrow: 0 },
  chips: { paddingHorizontal: spacing.base, gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 15 },
  cards: { gap: spacing.md },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontFamily: type.weight.bold, fontSize: 18 },
  blurb: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: type.weight.medium, fontSize: 13 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radii.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 64 },
  rowTitle: { fontFamily: type.weight.semibold, fontSize: 16 },
  setup: { gap: spacing.sm },
  setupLabel: { fontFamily: type.weight.semibold, fontSize: 16 },
  lengths: { flexDirection: 'row', gap: spacing.sm },
  length: { flex: 1, minHeight: 60, borderRadius: radii.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lengthName: { fontFamily: type.weight.bold, fontSize: 15 },
  declineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
});
