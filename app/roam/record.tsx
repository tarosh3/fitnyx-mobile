import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { cleanActivityName, defaultActivityName } from '@/src/features/roam/activityName';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { LiveRecordingView } from '@/src/features/roam/components/LiveRecordingView';
import { RecordingSummaryView } from '@/src/features/roam/components/RecordingSummaryView';
import { computeStats, type VehicleWindow } from '@/src/features/roam/geo';
import { getGoalTracker, type GoalTracker } from '@/src/features/roam/goalTracker';
import { readVehicleWindows } from '@/src/features/roam/motion';
import { shareRawTrack } from '@/src/features/roam/rawExport';
import { clearRecording } from '@/src/features/roam/recordingStore';
import { saveRoam } from '@/src/features/roam/upload';
import { useRoamRecording } from '@/src/features/roam/useRoamRecording';
import { retentionMetricsKey } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

type Modal = 'finish' | 'discard' | 'queued' | 'too-short' | null;

export default function RoamRecordScreen() {
  const palette = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recording = useRoamRecording();
  const [phase, setPhase] = useState<'live' | 'summary'>('live');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [name, setName] = useState('');
  // The phone's own "in a vehicle" periods, read once the Roam is finished.
  const [vehicleWindows, setVehicleWindows] = useState<VehicleWindow[]>([]);
  const [tracker, setTracker] = useState<GoalTracker | null>(null);

  // Nothing recording (opened directly / already saved) → back to Roam home.
  useEffect(() => {
    if (!recording.loading && !recording.meta) router.dismissTo('/roam');
  }, [recording.loading, recording.meta, router]);

  useEffect(() => {
    if (recording.meta?.finishedAtMs) setPhase('summary');
  }, [recording.meta?.finishedAtMs]);

  const { meta: doneMeta } = recording;
  useEffect(() => {
    if (phase === 'summary') getGoalTracker(doneMeta?.clientId).then(setTracker);
  }, [phase, doneMeta?.clientId]);
  useEffect(() => {
    if (!doneMeta?.finishedAtMs) return;
    let live = true;
    void readVehicleWindows(doneMeta.startedAtMs, doneMeta.pausedAtMs ?? doneMeta.finishedAtMs).then((w) => {
      if (live) setVehicleWindows(w);
    });
    return () => {
      live = false;
    };
  }, [doneMeta?.finishedAtMs, doneMeta?.startedAtMs, doneMeta?.pausedAtMs]);

  // The review shows what the server will compute — including the vehicle windows.
  const reviewStats = useMemo(
    () => (doneMeta && vehicleWindows.length ? computeStats(recording.points, doneMeta.type, vehicleWindows) : recording.stats),
    [doneMeta, recording.points, recording.stats, vehicleWindows],
  );

  const finish = async () => {
    setModal(null);
    const done = await recording.finish();
    if (done) setName(defaultActivityName(done.meta.type, new Date(done.meta.startedAtMs)));
    setPhase('summary');
  };

  // The Roam list refetches on focus. Its cache is the offline copy of the
  // history, so it's never deleted here — that emptied the list for anyone
  // who saved a Roam without signal.
  const leave = async () => {
    // Back to the Roam screen already underneath — replace() would stack a second one.
    router.dismissTo('/roam');
  };

  const save = async () => {
    if (!recording.meta) return;
    setSaving(true);
    setError(null);
    try {
      // The untouched default isn't stored — the app derives it — so a later
      // rename back to "Morning Run" and the default stay the same thing.
      const cleaned = cleanActivityName(name);
      const custom = cleaned && cleaned !== defaultActivityName(recording.meta.type, new Date(recording.meta.startedAtMs));
      const outcome = await saveRoam(recording.meta, recording.points, custom ? cleaned : undefined, vehicleWindows);
      if (outcome.status === 'too-short') {
        setModal('too-short');
        return;
      }
      await clearRecording();
      if (user?.id && outcome.status === 'saved') {
        // Home's XP total includes Roam XP — don't wait out its staleTime.
        queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user.id) });
        // The detail screen opens next: give it (and offline viewing) the saved copy.
        await cacheSet(cacheKeys.roamActivity(user.id, outcome.activity.id), outcome.activity, cacheTTL.DAY).catch(
          () => undefined,
        );
      }
      if (outcome.status === 'saved') router.replace(`/roam/${outcome.activity.id}`);
      else setModal('queued');
    } catch (e) {
      setError((e as Error).message || 'Could not save this Roam. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    setModal(null);
    await recording.discard();
    await leave();
  };

  if (recording.loading || !recording.meta) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const { meta } = recording;
  const stats = phase === 'live' ? recording.stats : reviewStats;
  return (
    <Screen scroll={false} contentContainerStyle={styles.screen}>
      <PageHeader
        title={phase === 'live' ? `${ACTIVITY_LABEL[meta.type].toUpperCase()} IN PROGRESS` : 'REVIEW'}
        subtitle={phase === 'live' ? 'KEEPS RECORDING WITH THE SCREEN LOCKED' : undefined}
        backTo="/roam"
      />
      {phase === 'live' || !stats ? (
        <LiveRecordingView recording={recording} onFinish={() => setModal('finish')} />
      ) : (
        <RecordingSummaryView
          type={meta.type}
          stats={stats}
          elapsedSec={recording.elapsedMs / 1000}
          saving={saving}
          error={error}
          name={name}
          defaultName={defaultActivityName(meta.type, new Date(meta.startedAtMs))}
          onNameChange={setName}
          onSave={save}
          onDiscard={() => setModal('discard')}
          onExportRaw={() => void shareRawTrack(meta, recording.points).catch(() => undefined)}
          tracker={tracker}
        />
      )}

      <ConfirmModal
        visible={modal === 'finish'}
        title="FINISH ROAM?"
        message="GPS tracking stops and you'll review your route before saving."
        confirmLabel="FINISH"
        onConfirm={finish}
        onCancel={() => setModal(null)}
      />
      <ConfirmModal
        visible={modal === 'discard'}
        title="DISCARD ROAM?"
        message="This route will be deleted and can't be recovered."
        confirmLabel="DISCARD"
        variant="danger"
        onConfirm={discard}
        onCancel={() => setModal(null)}
      />
      <ConfirmModal
        visible={modal === 'queued'}
        title="SAVED OFFLINE"
        message="You're offline, so your Roam will upload automatically once you're back online."
        confirmLabel="OK"
        showCancel={false}
        onConfirm={leave}
        onCancel={leave}
      />
      <ConfirmModal
        visible={modal === 'too-short'}
        title="TOO SHORT TO SAVE"
        message="We didn't capture enough GPS points for this Roam. Try again with location on and a clear view of the sky."
        confirmLabel="DISCARD"
        showCancel={false}
        onConfirm={discard}
        onCancel={discard}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, paddingBottom: 24 },
});
