import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Lightbulb, Maximize2, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddToRoutineSheet } from '@/src/features/workouts/library/AddToRoutineSheet';
import { ExerciseProgress } from '@/src/features/workouts/library/ExerciseProgress';
import { howToSteps } from '@/src/features/workouts/library/text';
import { partOf, trackingOf } from '@/src/features/workouts/model';
import { startWorkout } from '@/src/features/workouts/start';
import { BottomBar, Button, IconButton, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { exerciseImage, ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { PartChip, Pill } from '@/src/features/workouts/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { removeCustomExercise } from '@/src/lib/offline/customExercises';
import { fetchExerciseWithCache } from '@/src/lib/offline/exerciseCache';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import type { Exercise, RelatedExercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

type Tab = 'how' | 'progress' | 'similar';
const TABS: { key: Tab; label: string }[] = [{ key: 'how', label: 'How to' }, { key: 'progress', label: 'My progress' }, { key: 'similar', label: 'Similar' }];

function Video({ exercise }: { exercise: Exercise }) {
  const c = useThemeColors();
  const view = useRef<VideoView>(null);
  const url = exercise.video_url || (exercise.media_url?.toLowerCase().endsWith('.mp4') ? exercise.media_url : null);
  const player = useVideoPlayer(url || null, (p) => { p.loop = true; p.muted = true; p.play(); });
  const img = exerciseImage(exercise, 480);
  if (!url) {
    return img ? <Image source={{ uri: img }} style={[styles.media, { backgroundColor: c.surface }]} resizeMode="cover" accessibilityIgnoresInvertColors />
      : <View style={[styles.media, styles.center, { backgroundColor: c.parts[partOf(exercise)].bg }]}><ExerciseThumb exercise={exercise} size={96} /></View>;
  }
  return (
    <Pressable onPress={() => view.current?.enterFullscreen().catch(() => undefined)} accessibilityRole="button" accessibilityLabel={`Play ${exercise.title} video full screen`}>
      <VideoView ref={view} player={player} style={[styles.media, { backgroundColor: c.surface }]} contentFit="cover" nativeControls={false} fullscreenOptions={{ enable: true }} />
      <View style={[styles.full, { backgroundColor: c.card }]}><Maximize2 size={18} color={c.text} /></View>
    </Pressable>
  );
}

/** Everything about one exercise: video, how-to, my progress, similar ones. */
export function ExerciseDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const space = useBottomBarSpace();
  const { activeSession, setActiveSession } = useWorkout();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('how');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExercise(null);
    setFailed(false);
    fetchExerciseWithCache(String(uuid)).then((e) => (e ? setExercise(e) : setFailed(true))).catch(() => setFailed(true));
  }, [uuid]);

  if (!exercise) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        <TopBar title="Exercise" />
        {failed ? <Text style={[styles.body, styles.pad, { color: c.mutedText }]}>Couldn’t load this exercise. Check your connection.</Text>
          : <ActivityIndicator style={styles.spinner} color={c.primary} />}
      </View>
    );
  }

  const t = trackingOf(exercise);
  const steps = howToSteps(exercise.how_to);
  const muscles = [...(exercise.primary_muscles ?? []), ...(exercise.secondary_muscles ?? [])].map((m) => m.name).filter(Boolean);
  const similar: RelatedExercise[] = [...(exercise.variations ?? []), ...(exercise.alternatives ?? [])].filter((r, i, a) => r.uuid && r.uuid !== exercise.uuid && a.findIndex((x) => x.uuid === r.uuid) === i);

  const addToWorkout = () => router.dismissTo(`/workouts/session/${activeSession!.id}?add=${exercise.uuid}`);
  const startWithIt = async () => {
    setAdding(false);
    try {
      await startWorkout({}, { router, setActiveSession }, { addExerciseUuid: exercise.uuid });
    } catch {
      toast('We couldn’t start the workout. Try again.', 'error');
    }
  };

  // The user's own exercise: removing hides it from lists; past sets keep it.
  const mine = !!exercise.owner_id && !exercise.archived_at;
  const remove = async () => {
    setBusy(true);
    try {
      await removeCustomExercise(exercise.uuid);
      setRemoving(false);
      toast(`Removed ${exercise.title}`);
      router.back();
    } catch (e) {
      toast((e as { status?: number; message?: string }).status ? 'Couldn’t remove it. Try again.' : (e as Error).message || 'You’re offline — try again when connected', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title={exercise.title} right={mine ? (
        <IconButton label="Remove from my exercises" onPress={() => setRemoving(true)}><Trash2 size={20} color={c.destructive} /></IconButton>
      ) : undefined} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]}>
        <Video exercise={exercise} />
        <View style={styles.chips}>
          <PartChip part={partOf(exercise)} />
          {(exercise.equipment ?? []).slice(0, 3).map((e) => <Pill key={e.name}>{e.name}</Pill>)}
        </View>

        <View style={[styles.tabs, { backgroundColor: c.surface }]} accessibilityRole="tablist">
          {TABS.map((x) => (
            <Pressable key={x.key} onPress={() => setTab(x.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === x.key }}
              style={[styles.tab, tab === x.key && { backgroundColor: c.card }]}>
              <Text style={[styles.tabText, { color: tab === x.key ? c.text : c.mutedText }]}>{x.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'how' ? (
          <View style={styles.section}>
            {steps.length ? steps.map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.num, { backgroundColor: c.accentSoft }]}><Text style={[styles.numText, { color: c.accent }]}>{i + 1}</Text></View>
                <Text style={[styles.body, styles.flex, { color: c.text }]}>{s}</Text>
              </View>
            )) : <Text style={[styles.body, { color: c.mutedText }]}>No steps yet. Move slowly and keep good form.</Text>}
            {exercise.pro_tip ? (
              <View style={[styles.tip, { backgroundColor: c.parts.shoulders.bg }]}>
                <Lightbulb size={20} color={c.parts.shoulders.fg} />
                <Text style={[styles.body, styles.flex, { color: c.text }]}><Text style={styles.bold}>Tip: </Text>{exercise.pro_tip}</Text>
              </View>
            ) : null}
            {muscles.length ? <Text style={[styles.body, { color: c.mutedText }]}>Works: {muscles.join(', ')}</Text> : null}
          </View>
        ) : tab === 'progress' ? (
          <ExerciseProgress uuid={exercise.uuid} t={t} />
        ) : (
          <View style={styles.section}>
            {similar.length ? similar.map((r) => (
              <Pressable key={r.uuid} onPress={() => router.push(`/workouts/exercise/${r.uuid}`)} accessibilityRole="button" accessibilityLabel={r.name}
                style={({ pressed }) => [styles.similar, { borderColor: c.border }, pressed && { backgroundColor: c.surface }]}>
                {r.image ? <Image source={{ uri: r.image }} style={[styles.simImg, { backgroundColor: c.surface }]} /> : <View style={[styles.simImg, { backgroundColor: c.surface }]} />}
                <Text style={[styles.simName, { color: c.text }]} numberOfLines={2}>{r.name}</Text>
              </Pressable>
            )) : <Text style={[styles.body, { color: c.mutedText }]}>No similar exercises listed.</Text>}
          </View>
        )}
      </ScrollView>

      <BottomBar>
        {activeSession ? <Button testID="add-to-workout" title="Add to current workout" icon={<Plus size={20} color={c.primaryText} />} onPress={addToWorkout} />
          : <Button testID="add-to-routine" title="Add to a routine" icon={<Plus size={20} color={c.primaryText} />} onPress={() => setAdding(true)} />}
      </BottomBar>

      <AddToRoutineSheet visible={adding} exercise={exercise} onStart={startWithIt} onClose={() => setAdding(false)} />

      <Sheet visible={removing} title={`Remove ${exercise.title}?`} onClose={() => setRemoving(false)}
        footer={<>
          <Button variant="danger" title="Remove" loading={busy} onPress={remove} />
          <Button variant="secondary" title="Keep it" onPress={() => setRemoving(false)} />
        </>}>
        <Text style={[styles.body, { color: c.mutedText }]}>It disappears from your exercise list. Sets you already logged keep it in your history.</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.base },
  spinner: { marginTop: spacing['3xl'] },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  media: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.xl, overflow: 'hidden' },
  full: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tabs: { flexDirection: 'row', borderRadius: radii.lg, padding: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: type.weight.semibold, fontSize: 15 },
  section: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: type.weight.bold, fontSize: 15 },
  body: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 23 },
  bold: { fontFamily: type.weight.bold },
  tip: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, alignItems: 'flex-start' },
  similar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  simImg: { width: 56, height: 56, borderRadius: radii.md },
  simName: { flex: 1, fontFamily: type.weight.semibold, fontSize: 16 },
});
