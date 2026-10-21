import { useWorkoutDetails, updateWorkoutDetails, loadWorkoutDetails } from '@/src/lib/workoutActivityDetails';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Timer } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines } from '@/src/features/workouts/hooks';
import { BlockMenuSheet } from '@/src/features/workouts/logger/BlockMenuSheet';
import { ExerciseBlock } from '@/src/features/workouts/logger/ExerciseBlock';
import { extraBlocks, routineWithExtras } from '@/src/features/workouts/logger/finish';
import { FinishSheet } from '@/src/features/workouts/logger/FinishSheet';
import { LoggerHeader, type TimerState } from '@/src/features/workouts/logger/LoggerHeader';
import { PrCelebration } from '@/src/features/workouts/logger/PrCelebration';
import { RestBar } from '@/src/features/workouts/logger/RestBar';
import { blockDone, nextUp, pendingCount, pendingRows } from '@/src/features/workouts/logger/rows';
import { SetEditorSheet } from '@/src/features/workouts/logger/SetEditorSheet';
import { useHoldTimer } from '@/src/features/workouts/logger/useHoldTimer';
import { useWorkoutLogger } from '@/src/features/workouts/logger/useWorkoutLogger';
import { useNotificationWorkoutAction } from '@/src/features/workouts/logger/useNotificationWorkoutAction';
import { type DraftSet, describeSet, logToDraft, trackingOf } from '@/src/features/workouts/model';
import { isReady } from '@/src/features/workouts/start';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { updateRoutine } from '@/src/lib/api/routines';
import { fetchExerciseWithCache } from '@/src/lib/offline/exerciseCache';
import { offlineAbandonSession, offlineFinishSession } from '@/src/lib/offline/offlineApi';
import { useWorkout, useWorkoutTimer } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

type Editor = { bi: number; kind: 'pending'; pi: number } | { bi: number; kind: 'log'; logId: string };

const asLog = (d: DraftSet) => ({ reps: d.reps, weight_kg: d.weightKg, duration_sec: d.durationSec, distance_m: d.distanceM });

/** The live workout: one exercise open at a time, ✓ to log a set. */
export function LoggerScreen() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const sessionId = String(id ?? '');
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isOffline } = useOfflineAware();
  const { activeSession, pauseActiveSession, resumeActiveSession, finishActiveSession, abandonActiveSession } = useWorkout();
  const { elapsedTime } = useWorkoutTimer();
  const lg = useWorkoutLogger(sessionId);
  useNotificationWorkoutAction(sessionId, !lg.loading, () => toast('Couldn’t update the timer. Please try again.'));
  const routines = useRoutines();

  // null = follow the first unfinished exercise; { key: null } = all closed.
  const [open, setOpen] = useState<{ key: string | null } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [menuBi, setMenuBi] = useState<number | null>(null);
  const [removeBi, setRemoveBi] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ swapBi: number | null } | null>(null);
  const activityDetails = useWorkoutDetails(sessionId);
  const restEnd = activityDetails.restEnd;
  useEffect(() => { void loadWorkoutDetails(sessionId); }, [sessionId]);
  const [pr, setPr] = useState<{ title: string; detail: string } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const logging = useRef(new Set<string>());
  const leaving = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<number, number>>({});

  const live = activeSession && lg.session && activeSession.id === lg.session.id ? activeSession : lg.session;
  const isActive = !!activeSession && !!live && activeSession.id === live.id;
  const state: TimerState = !live || isReady(live) ? 'ready' : live.status === 'in_progress' ? 'running' : 'paused';
  const elapsed = isActive ? elapsedTime : live?.total_duration_sec ?? 0;
  const routine = live?.plan_id ? routines.data?.find((r) => r.id === live.plan_id) ?? null : null;
  const title = routine?.title ?? (live?.plan_id ? 'Today’s workout' : 'Workout');

  const blocks = lg.blocks;
  const currentIdx = blocks.findIndex((b) => !blockDone(b));
  const expandedIdx = open ? (open.key ? blocks.findIndex((b) => b.key === open.key) : -1) : currentIdx;
  const setsDone = blocks.reduce((n, b) => n + b.logs.length, 0);
  const volumeKg = blocks.reduce((total, block) => total + block.logs.reduce((sum, log) => sum + (log.reps ?? 0) * (log.weight_kg ?? 0), 0), 0);
  useEffect(() => {
    if (!lg.loading && isActive) void updateWorkoutDetails(sessionId, { title, sets: setsDone, volumeKg });
  }, [sessionId, lg.loading, isActive, title, setsDone, volumeKg]);
  const setsLeft = blocks.reduce((n, b) => n + pendingCount(b), 0);

  // Opened a finished workout (old link, notification): show it in history instead.
  useEffect(() => {
    if (!leaving.current && live && ['completed', 'abandoned'].includes(live.status)) router.replace(`/workouts/history/${live.id}`);
  }, [live?.status]);

  // ?add=<exercise>: Quick start → Cardio, or "Add to current workout" on an exercise page.
  const handledAdd = useRef<string | null>(null);
  useEffect(() => {
    if (!add) { handledAdd.current = null; return; }
    if (lg.loading || handledAdd.current === add) return;
    handledAdd.current = add;
    fetchExerciseWithCache(add)
      .then((ex) => {
        if (!ex) return;
        if (blocks.some((b) => b.uuid === ex.uuid)) toast(`${ex.title} is already in this workout`);
        else { lg.addExercises([ex]); setOpen(null); }
      })
      .catch(() => undefined)
      .finally(() => router.setParams({ add: undefined }));
  }, [add, lg.loading]);

  const startTimer = async (announce: boolean) => {
    if (state === 'running') return;
    const first = state === 'ready';
    try { await resumeActiveSession(); }
    catch { toast('Couldn’t start the timer. Please try again.'); return; }
    if (announce || first) toast(first ? 'Timer started' : 'Timer resumed');
  };

  const pauseTimer = async () => {
    try { await pauseActiveSession(); }
    catch { toast('Couldn’t pause the timer. Please try again.'); return; }
    toast('Paused — tap ▶ to carry on');
  };

  const checkPending = async (bi: number, pi: number) => {
    const b = blocks[bi];
    const rowKey = `${b?.key}:${b?.logs.length}:${pi}`;
    if (!b || logging.current.has(rowKey)) return;
    logging.current.add(rowKey);
    haptic.light();
    if (hold.hold?.bi === bi && hold.hold.pi === pi) hold.stop(0);
    if (state !== 'running') startTimer(false).catch(() => undefined);
    try {
      const res = await lg.logPending(bi, pi);
      if (!res) return;
      if (res.pr) {
        haptic.success();
        setPr({ title: b.exercise?.title ?? 'Exercise', detail: describeSet(trackingOf(b.exercise), res.log) });
      }
      if (res.restSec) void updateWorkoutDetails(sessionId, { restEnd: Date.now() + res.restSec * 1000 });
      if (pendingCount(b) === 1 && open?.key === b.key) setOpen(null);
    } catch {
      toast('Couldn’t save that set. Try again.');
    } finally {
      logging.current.delete(rowKey);
    }
  };

  const hold = useHoldTimer((bi, pi) => { checkPending(bi, pi); });

  const toggleHold = (bi: number, pi: number) => {
    const row = pendingRows(blocks[bi])[pi];
    if (hold.hold && hold.hold.bi === bi && hold.hold.pi === pi) {
      const held = hold.stop(row.durationSec);
      if (held > 0) lg.setDraft(bi, pi, { ...row, durationSec: held });
      toast('Stopped — tick ✓ to log it');
      return;
    }
    if (state !== 'running') startTimer(false).catch(() => undefined);
    hold.start(bi, pi, row.durationSec);
  };

  const jump = (i: number) => {
    setOpen({ key: blocks[i]?.key ?? null });
    const y = positions.current[i];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - spacing.sm), animated: true });
  };

  const leave = () => {
    toast('Your workout is still open');
    if (router.canGoBack()) router.back();
    else router.replace('/workouts');
  };

  const finish = async ({ addExtras }: { addExtras: boolean }) => {
    setBusy(true);
    try {
      if (addExtras && routine) {
        if (isOffline) toast('Offline — routine not updated');
        else {
          const updated = await updateRoutine(routine.id, routineWithExtras(routine, extraBlocks(blocks, routine))).catch(() => null);
          if (updated && routines.data) routines.setData(routines.data.map((r) => (r.id === updated.id ? updated : r)));
          if (!updated) toast('Couldn’t update the routine');
        }
      }
      leaving.current = true;
      if (isActive) await finishActiveSession();
      else await offlineFinishSession(sessionId);
      haptic.success();
      setFinishOpen(false);
      router.replace(`/workouts/summary/${sessionId}`);
    } catch {
      leaving.current = false;
      toast('Couldn’t finish. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    try {
      leaving.current = true;
      if (isActive) await abandonActiveSession();
      else await offlineAbandonSession(sessionId);
      setFinishOpen(false);
      toast('Workout discarded');
      router.dismissTo('/workouts');
    } catch {
      leaving.current = false;
      toast('Couldn’t discard. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (bi: number) => {
    const b = blocks[bi];
    setRemoveBi(null);
    try {
      for (const l of b.logs) await lg.deleteLog(bi, l.id);
      lg.removeBlock(bi);
      setOpen(null);
      toast(`Removed ${b.exercise?.title ?? 'exercise'}`);
    } catch {
      toast('Couldn’t remove it. Try again.');
    }
  };

  // ---- editor values ----
  const eb = editor ? blocks[editor.bi] : null;
  const et = trackingOf(eb?.exercise);
  const elog = editor?.kind === 'log' ? eb?.logs.find((l) => l.id === editor.logId) : undefined;
  const evalue: DraftSet | null = !eb || !editor ? null : editor.kind === 'log' ? (elog ? logToDraft(elog) : null) : pendingRows(eb)[editor.pi] ?? null;
  const esetNo = !eb || !editor ? 0 : editor.kind === 'log' ? eb.logs.findIndex((l) => l.id === editor.logId) + 1 : eb.logs.length + editor.pi + 1;
  const mb = menuBi != null ? blocks[menuBi] : null;
  const rb = removeBi != null ? blocks[removeBi] : null;

  if (lg.loading && !blocks.length) {
    return <View style={[styles.center, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} size="large" /></View>;
  }
  if (lg.error && !lg.session) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, padding: spacing.xl, gap: spacing.md }]}>
        <Text style={[styles.h, { color: c.text }]}>Couldn’t open this workout</Text>
        <Text style={[styles.p, { color: c.mutedText, textAlign: 'center' }]}>{lg.error}</Text>
        <Button title="Try again" onPress={lg.reload} style={{ flexGrow: 0, alignSelf: 'stretch' }} />
        <Button variant="quiet" title="Back to Workouts" onPress={() => router.dismissTo('/workouts')} style={{ flexGrow: 0 }} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <LoggerHeader title={title} elapsedSec={elapsed} state={state} setsDone={setsDone} setsTotal={setsDone + setsLeft}
        segments={blocks.map((b, i) => (blockDone(b) ? 'done' : i === expandedIdx ? 'current' : 'todo'))}
        onBack={leave} onStart={() => startTimer(true)} onPause={pauseTimer} onFinish={() => setFinishOpen(true)} onJump={jump} />

      <ScrollView ref={scroll} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (restEnd ? 200 : spacing['2xl']) }]}>
        {state === 'ready' ? (
          <View style={[styles.ready, { backgroundColor: c.accentSoft }]}>
            <Timer size={24} color={c.accent} />
            <View style={styles.flex}>
              <Text style={[styles.readyTitle, { color: c.text }]}>{blocks.length ? 'Ready when you are' : 'Empty workout'}</Text>
              <Text style={[styles.p, { color: c.mutedText }]}>
                {blocks.length ? 'The clock starts when you tick your first set — or tap Start.' : 'Add the exercises you’re doing. The clock starts when you tick your first set.'}
              </Text>
            </View>
          </View>
        ) : null}

        {blocks.map((b, bi) => (
          <View key={b.key} onLayout={(e) => { positions.current[bi] = e.nativeEvent.layout.y; }}>
            <ExerciseBlock block={b} bi={bi} expanded={bi === expandedIdx} hold={hold.hold}
              onToggle={() => setOpen({ key: bi === expandedIdx ? null : b.key })}
              onOpenExercise={() => router.push(`/workouts/exercise/${b.uuid}`)}
              onMenu={() => setMenuBi(bi)}
              onEditPending={(pi) => setEditor({ bi, kind: 'pending', pi })}
              onCheckPending={(pi) => checkPending(bi, pi)}
              onEditLog={(logId) => setEditor({ bi, kind: 'log', logId })}
              onHoldTimer={(pi) => toggleHold(bi, pi)}
              onAddSet={() => { lg.addSet(bi); haptic.light(); }} />
          </View>
        ))}

        <Button testID="add-exercise" variant={blocks.length ? 'secondary' : 'primary'} title={blocks.length ? 'Add exercise' : 'Add exercises'}
          icon={<Plus size={20} color={blocks.length ? c.text : c.primaryText} />} onPress={() => setPicker({ swapBi: null })} style={styles.addBtn} />
      </ScrollView>

      {restEnd ? <RestBar endTimestamp={restEnd} seconds={Math.max(0, Math.ceil((restEnd - Date.now()) / 1000))} onAdjust={(end) => { void updateWorkoutDetails(sessionId, { restEnd: end }); }} onDone={() => { void updateWorkoutDetails(sessionId, { restEnd: undefined }); }}
        next={nextUp(blocks, (b, d) => describeSet(trackingOf(b.exercise), asLog(d)))} /> : null}

      {eb && evalue ? (
        <SetEditorSheet visible t={et} value={evalue} logged={editor?.kind === 'log'} rpe={elog?.rpe ?? null}
          title={`${eb.exercise?.title ?? 'Exercise'} · set ${esetNo}`}
          subtitle={editor?.kind === 'log' ? 'Fix a set you logged' : 'Change it before you tick ✓'}
          onClose={() => setEditor(null)}
          onSave={(d, rpe) => {
            const ed = editor!;
            setEditor(null);
            if (ed.kind === 'pending') lg.setDraft(ed.bi, ed.pi, d);
            else lg.updateLog(ed.bi, ed.logId, d, rpe).then(() => toast('Set updated')).catch(() => toast('Couldn’t save the change'));
          }}
          onDelete={() => {
            const ed = editor!;
            setEditor(null);
            if (ed.kind === 'pending') lg.removePending(ed.bi);
            else lg.deleteLog(ed.bi, ed.logId).then(() => toast('Set deleted')).catch(() => toast('Couldn’t delete the set'));
          }} />
      ) : null}

      <BlockMenuSheet visible={!!mb} name={mb?.exercise?.title ?? 'Exercise'} setsLogged={mb?.logs.length ?? 0}
        canMoveUp={(menuBi ?? 0) > 0} canMoveDown={menuBi != null && menuBi < blocks.length - 1}
        onClose={() => setMenuBi(null)}
        onHowTo={() => { setMenuBi(null); if (mb) router.push(`/workouts/exercise/${mb.uuid}`); }}
        onSwap={() => { setMenuBi(null); setPicker({ swapBi: menuBi }); }}
        onMove={(d) => { if (menuBi != null) { lg.moveBlock(menuBi, d); setOpen({ key: mb?.key ?? null }); setMenuBi(null); } }}
        onRemove={() => { const bi = menuBi; setMenuBi(null); if (bi == null) return; if (blocks[bi]?.logs.length) setRemoveBi(bi); else removeBlock(bi); }} />

      <Sheet visible={!!rb} title={`Remove ${rb?.exercise?.title ?? 'exercise'}?`} onClose={() => setRemoveBi(null)}
        footer={<>
          <Button variant="danger" title="Remove and delete sets" onPress={() => removeBi != null && removeBlock(removeBi)} />
          <Button variant="secondary" title="Keep it" onPress={() => setRemoveBi(null)} />
        </>}>
        <Text style={[styles.p, { color: c.mutedText }]}>Its {rb?.logs.length} logged set{rb?.logs.length === 1 ? '' : 's'} will be deleted from this workout.</Text>
      </Sheet>

      <ExercisePicker visible={!!picker} mode={picker?.swapBi != null ? 'single' : 'multi'} onClose={() => setPicker(null)}
        title={picker?.swapBi != null ? 'Swap exercise' : 'Add exercises'}
        subtitle={picker?.swapBi != null ? `Instead of ${blocks[picker.swapBi]?.exercise?.title ?? 'this one'}` : 'Tick everything you want to do'}
        addedUuids={blocks.map((b) => b.uuid)}
        emptyLabel={picker?.swapBi != null ? 'Pick one' : 'Pick exercises'}
        confirmLabel={(p) => (picker?.swapBi != null ? 'Swap' : `Add ${p.length} exercise${p.length === 1 ? '' : 's'}`)}
        onConfirm={(p) => {
          const swapBi = picker?.swapBi;
          setPicker(null);
          if (swapBi != null && p[0]) { lg.swapBlock(swapBi, p[0]); toast(`Swapped to ${p[0].title}`); return; }
          lg.addExercises(p);
          if (p.length) { setOpen(null); toast(`Added ${p.length === 1 ? p[0].title : `${p.length} exercises`}`); }
        }} />

      <FinishSheet visible={finishOpen} setsDone={setsDone} setsLeft={setsLeft} routineTitle={routine?.title ?? null}
        extras={extraBlocks(blocks, routine).map((b) => b.exercise?.title ?? 'Exercise')} busy={busy}
        onFinish={finish} onDiscard={discard} onClose={() => setFinishOpen(false)} />

      {pr ? <PrCelebration title={pr.title} detail={pr.detail} onClose={() => setPr(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.base, gap: spacing.md },
  ready: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radii.lg },
  readyTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  h: { fontFamily: type.weight.bold, fontSize: 20 },
  p: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 21 },
  addBtn: { flexGrow: 0, marginTop: spacing.sm },
});
