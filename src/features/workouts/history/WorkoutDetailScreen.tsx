import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, RotateCcw, Share2, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { ShareCardSheet } from '@/src/features/share/ShareCardSheet';
import { LoggedGroup } from '@/src/features/workouts/history/LoggedGroup';
import { useSessionDetail } from '@/src/features/workouts/history/useSessionDetail';
import { sessionCardData } from '@/src/features/workouts/history/workoutCard';
import { useRoutines, useWorkoutHistory } from '@/src/features/workouts/hooks';
import { nextSetNumber } from '@/src/features/workouts/logger/rows';
import { SetEditorSheet } from '@/src/features/workouts/logger/SetEditorSheet';
import { type DraftSet, draftToLog, fmtClock, fmtKm, fmtVolume, logToDraft, plural, prefill, trackingOf } from '@/src/features/workouts/model';
import { startWorkout } from '@/src/features/workouts/start';
import { BottomBar, Button, IconButton, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';
import { Pill } from '@/src/features/workouts/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { routineFromSession } from '@/src/lib/api/routines';
import { deleteSession } from '@/src/lib/api/workoutSessions';
import { offlineDeleteLog, offlineLogSet, offlineUpdateLog } from '@/src/lib/offline/offlineApi';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import type { Exercise } from '@/src/types/exercise';
import { spacing, type } from '@/src/styles/tokens';

type Editor = { kind: 'log'; logId: string } | { kind: 'new'; uuid: string; exercise: Exercise | null };

/** A finished workout: every set, fixable after the fact; Share / Repeat / Save as routine / Delete. */
export function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const space = useBottomBarSpace();
  const { isOffline } = useOfflineAware();
  const { activeSession, setActiveSession } = useWorkout();
  const d = useSessionDetail(sessionId);
  const history = useWorkoutHistory();
  const routines = useRoutines();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<ShareCardData | null>(null);

  const s = d.session;
  const routine = s?.plan_id ? routines.data?.find((r) => r.id === s.plan_id) : undefined;
  const name = routine?.title ?? history.data?.find((h) => h.id === s?.id)?.plan_name ?? 'Workout';
  const date = s ? new Date(s.started_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const t = d.totals;

  const elog = editor?.kind === 'log' ? d.logs.find((l) => l.id === editor.logId) : undefined;
  const eex = editor?.kind === 'log' ? (elog ? d.exercises[elog.exercise_uuid] ?? null : null) : editor?.exercise ?? null;
  const etype = trackingOf(eex);
  const groupLogs = editor?.kind === 'new' ? d.logs.filter((l) => l.exercise_uuid === editor.uuid) : [];
  const evalue: DraftSet | null = editor?.kind === 'log' ? (elog ? logToDraft(elog) : null)
    : editor ? prefill(etype, null, groupLogs.length ? logToDraft(groupLogs[groupLogs.length - 1]) : null, null) : null;

  // The backend rescores a finished workout's Grit on every set change; fetch it again.
  const refreshGrit = () => {
    if (!isOffline && s?.status === 'completed') d.reload();
  };

  const saveSet = async (v: DraftSet, rpe: number | null) => {
    const ed = editor;
    setEditor(null);
    if (!ed) return;
    try {
      if (ed.kind === 'log') {
        const f = draftToLog(etype, v);
        const updated = await offlineUpdateLog(sessionId, ed.logId, {
          actual_reps: f.actual_reps,
          actual_weight_kg: 'actual_weight_kg' in f ? f.actual_weight_kg ?? 0 : undefined,
          actual_duration_sec: 'actual_duration_sec' in f ? f.actual_duration_sec : undefined,
          actual_distance_m: 'actual_distance_m' in f ? f.actual_distance_m : undefined,
          rpe: rpe ?? undefined,
        });
        d.setLogs((prev) => prev.map((l) => (l.id === ed.logId ? { ...l, ...updated } : l)));
        toast('Set updated');
      } else {
        const created = await offlineLogSet(sessionId, { exercise_uuid: ed.uuid, set_number: nextSetNumber(groupLogs), ...draftToLog(etype, v) });
        if (ed.exercise && !d.exercises[ed.uuid]) d.reload();
        else d.setLogs((prev) => [...prev, created]);
        toast('Set added');
      }
      refreshGrit();
    } catch {
      toast('Couldn’t save the change');
    }
  };

  const deleteSet = async () => {
    const ed = editor;
    setEditor(null);
    if (ed?.kind !== 'log') return;
    try {
      await offlineDeleteLog(sessionId, ed.logId);
      d.setLogs((prev) => prev.filter((l) => l.id !== ed.logId));
      toast('Set deleted');
      refreshGrit();
    } catch {
      toast('Couldn’t delete the set');
    }
  };

  const repeat = async () => {
    if (activeSession) { toast('Finish your open workout first'); router.push(`/workouts/session/${activeSession.id}`); return; }
    setBusy(true);
    try {
      if (s?.plan_id && s.day_id) await startWorkout({ planId: s.plan_id, dayId: s.day_id }, { router, setActiveSession });
      else {
        const r = await routineFromSession(sessionId);
        if (routines.data) routines.setData([r, ...routines.data]);
        toast(`Saved as routine “${r.title}”`);
        router.push(`/workouts/routine/${r.id}`);
      }
    } catch {
      toast(isOffline ? 'You’re offline — try again when connected' : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteSession(sessionId);
      if (history.data) history.setData(history.data.filter((h) => h.id !== sessionId));
      setConfirmDelete(false);
      toast('Workout deleted');
      router.canGoBack() ? router.back() : router.replace('/workouts?tab=history');
    } catch {
      toast(isOffline ? 'You’re offline — try again when connected' : 'Couldn’t delete it. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title={name} subtitle={date} right={
        <View style={styles.actions}>
          {s?.status === 'completed' && t.sets ? (
            <IconButton label="Share this workout" onPress={() => setCard(sessionCardData(name, { ...d, session: s }))}><Share2 size={20} color={c.text} /></IconButton>
          ) : null}
          <IconButton label="Delete this workout" onPress={() => setConfirmDelete(true)}><Trash2 size={20} color={c.destructive} /></IconButton>
        </View>
      } />
      {d.loading && !s ? <ActivityIndicator style={styles.spinner} color={c.primary} /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]}>
          <View style={styles.pills}>
            <Pill>{fmtClock(s?.total_duration_sec ?? 0)}</Pill>
            {t.volumeKg ? <Pill>{`${fmtVolume(t.volumeKg)} kg`}</Pill> : null}
            {t.distanceM ? <Pill>{`${fmtKm(t.distanceM)} km`}</Pill> : null}
            <Pill>{plural(t.sets, 'set')}</Pill>
            {t.prs ? <Pill tone="gold">{`🏆 ${plural(t.prs, 'new best')}`}</Pill> : null}
            {s?.grit != null ? <Pill>{`+${s.grit} Grit`}</Pill> : null}
          </View>
          <Text style={[styles.hint, { color: c.mutedText }]}>Tap a set to fix it.</Text>
          {d.groups.map((g) => (
            <LoggedGroup key={g.uuid} group={g} onOpenExercise={() => router.push(`/workouts/exercise/${g.uuid}`)}
              onEditSet={(logId) => setEditor({ kind: 'log', logId })}
              onAddSet={() => setEditor({ kind: 'new', uuid: g.uuid, exercise: g.exercise })} />
          ))}
          <Button variant="secondary" title="Add exercise" icon={<Plus size={20} color={c.text} />} onPress={() => setPicking(true)} style={styles.noFlex} />
        </ScrollView>
      )}

      <BottomBar>
        <Button testID="repeat" title={s?.plan_id ? 'Repeat workout' : 'Save as routine'} loading={busy}
          icon={s?.plan_id ? <RotateCcw size={20} color={c.primaryText} /> : undefined} onPress={repeat} />
      </BottomBar>

      {editor && evalue ? (
        <SetEditorSheet visible t={etype} value={evalue} logged={editor.kind === 'log'} rpe={elog?.rpe ?? null} canDelete={editor.kind === 'log'}
          title={eex?.title ?? 'Set'} subtitle={editor.kind === 'log' ? 'Fix this set' : 'Add a set you forgot'}
          onSave={saveSet} onDelete={deleteSet} onClose={() => setEditor(null)} />
      ) : null}

      <ExercisePicker visible={picking} mode="single" onClose={() => setPicking(false)} title="Add exercise" subtitle="Forgot one? Add it here."
        addedUuids={d.groups.map((g) => g.uuid)} emptyLabel="Pick one" confirmLabel={() => 'Next'}
        onConfirm={(p) => { setPicking(false); if (p[0]) setEditor({ kind: 'new', uuid: p[0].uuid, exercise: p[0] }); }} />

      <ShareCardSheet visible={card !== null} data={card} onClose={() => setCard(null)} />

      <Sheet visible={confirmDelete} title={`Delete ${name} from ${date}?`} onClose={() => setConfirmDelete(false)}
        footer={<>
          <Button variant="danger" title="Delete workout" loading={busy} onPress={remove} />
          <Button variant="secondary" title="Keep it" onPress={() => setConfirmDelete(false)} />
        </>}>
        <Text style={[styles.hint, { color: c.mutedText }]}>All {plural(t.sets, 'set')} in it are deleted too. This can’t be undone.</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spinner: { marginTop: spacing['3xl'] },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontFamily: type.weight.regular, fontSize: 15 },
  noFlex: { flexGrow: 0 },
});
