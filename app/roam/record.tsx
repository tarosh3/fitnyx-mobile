import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { LiveRecordingView } from '@/src/features/roam/components/LiveRecordingView';
import { RecordingSummaryView } from '@/src/features/roam/components/RecordingSummaryView';
import { clearRecording } from '@/src/features/roam/recordingStore';
import { saveRoam } from '@/src/features/roam/upload';
import { useRoamRecording } from '@/src/features/roam/useRoamRecording';
import { retentionMetricsKey } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { cacheInvalidate, cacheKeys } from '@/src/lib/cache';
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

  // Nothing recording (opened directly / already saved) → back to Roam home.
  useEffect(() => {
    if (!recording.loading && !recording.meta) router.dismissTo('/roam');
  }, [recording.loading, recording.meta, router]);

  const finish = async () => {
    setModal(null);
    await recording.finish();
    setPhase('summary');
  };

  const leave = async () => {
    if (user?.id) await cacheInvalidate(cacheKeys.roamActivities(user.id));
    // Back to the Roam screen already underneath — replace() would stack a second one.
    router.dismissTo('/roam');
  };

  const save = async () => {
    if (!recording.meta) return;
    setSaving(true);
    setError(null);
    try {
      const outcome = await saveRoam(recording.meta, recording.points);
      if (outcome.status === 'too-short') {
        setModal('too-short');
        return;
      }
      await clearRecording();
      if (user?.id) {
        await cacheInvalidate(cacheKeys.roamActivities(user.id));
        // Home's XP total includes Roam XP — don't wait out its staleTime.
        if (outcome.status === 'saved') queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user.id) });
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

  const { meta, stats } = recording;
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
          onSave={save}
          onDiscard={() => setModal('discard')}
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
