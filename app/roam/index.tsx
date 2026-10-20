import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Flame } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useGoals, useTodayActivity } from '@/src/features/goals/data';
import { activityGoals } from '@/src/features/goals/model';
import { ActivityGoalsSheet } from '@/src/features/goals/ui/ActivityGoalsSheet';
import { RoamGoalsRow } from '@/src/features/goals/ui/RoamGoalsRow';
import { ActivityRow } from '@/src/features/roam/components/ActivityRow';
import { WeekSummary } from '@/src/features/roam/components/WeekSummary';
import type { ActivityType } from '@/src/features/roam/geo';
import { startGoalTracker } from '@/src/features/roam/goalTracker';
import { getRecordingFor } from '@/src/features/roam/recordingStore';
import { useRoamActivities } from '@/src/features/roam/useRoamActivities';
import { useRoamRecording } from '@/src/features/roam/useRoamRecording';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

const TYPES: { label: string; value: ActivityType }[] = [
  { label: 'Run', value: 'run' },
  { label: 'Walk', value: 'walk' },
  { label: 'Ride', value: 'cycle' },
];

export default function RoamScreen() {
  const palette = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const { data, pending, loading, error, offline } = useRoamActivities(user?.id);
  const recording = useRoamRecording();
  const [type, setType] = useState<ActivityType>('run');
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<'denied' | 'blocked' | 'failed' | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const goals = useGoals();
  const today = useTodayActivity();
  const [editingGoals, setEditingGoals] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getRecordingFor(user?.id).then((m) => setInProgress(m != null));
    }, [user?.id]),
  );

  const onStart = async () => {
    setStarting(true);
    try {
      const result = await recording.start(type);
      if (result === 'granted') {
        // Today's goals and what was done before this Roam, for the live rings + alerts.
        const meta = await getRecordingFor(user?.id);
        if (meta) {
          await startGoalTracker({
            clientId: meta.clientId, type, goals: activityGoals(goals.data), before: today.day, weightKg: goals.data?.weight_kg ?? null,
          }).catch(() => undefined);
        }
        router.push('/roam/record');
      }
      else if (result === 'denied' || result === 'blocked') setNotice(result);
      else setNotice('failed');
    } catch {
      setNotice('failed');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="ROAM" subtitle="RUN · WALK · RIDE" backTo="/" />

      <View style={styles.section}>
        {inProgress ? (
          <Button title="CONTINUE YOUR ROAM" onPress={() => router.push('/roam/record')} />
        ) : (
          <>
            <SegmentedControl options={TYPES} value={type} onChange={setType} />
            {goals.data ? <RoamGoalsRow goals={goals.data} day={today.day} onEdit={() => setEditingGoals(true)} /> : null}
            <Button title={`START ${TYPES.find((t) => t.value === type)?.label.toUpperCase()}`} onPress={onStart} loading={starting} />
            <Text style={[styles.hint, { color: palette.mutedText }]}>
              Vehicle travel (car, bus, train, metro) is detected and never counts.
            </Text>
          </>
        )}
      </View>

      {data ? <WeekSummary week={data.week} /> : null}
      {data && data.data.length > 0 ? (
        <Pressable
          onPress={() => router.push('/roam/heatmap')}
          accessibilityRole="button"
          style={[styles.heatmapLink, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Flame size={18} color={palette.primary} />
          <View style={styles.heatmapText}>
            <Text style={[styles.heatmapTitle, { color: palette.text }]}>Your heatmap</Text>
            <Text style={[styles.hint, { color: palette.mutedText, textAlign: 'left' }]}>Every Roam on one map</Text>
          </View>
          <ChevronRight size={18} color={palette.mutedText} />
        </Pressable>
      ) : null}

      <Text style={[styles.heading, { color: palette.mutedText }]}>YOUR ROAMS</Text>
      {loading && !data ? <ActivityIndicator color={palette.primary} /> : null}
      {error ? (
        <Text style={[styles.hint, { color: offline ? palette.mutedText : palette.destructive }]}>{error}</Text>
      ) : null}
      {data && data.data.length === 0 && pending.length === 0 ? (
        <Text style={[styles.hint, { color: palette.mutedText }]}>No Roams yet — your first one will show up here.</Text>
      ) : null}
      <View style={styles.list}>
        {pending.map((a) => (
          <ActivityRow key={a.id} activity={a} pending />
        ))}
        {data?.data.map((a) => (
          <ActivityRow key={a.id} activity={a} onPress={() => router.push(`/roam/${a.id}`)} />
        ))}
      </View>

      <ConfirmModal
        visible={notice !== null}
        title={notice === 'failed' ? "COULDN'T START" : 'LOCATION NEEDED'}
        message={
          notice === 'blocked'
            ? 'Location access is turned off for FitNyx. Allow it in Settings ("While using the app") to record a Roam.'
            : notice === 'denied'
              ? 'Roam needs your location to map your route and measure distance.'
              : 'GPS tracking could not start. Check that location services are on and try again.'
        }
        confirmLabel={notice === 'blocked' ? 'OPEN SETTINGS' : 'OK'}
        showCancel={notice === 'blocked'}
        onConfirm={() => {
          if (notice === 'blocked') Linking.openSettings();
          setNotice(null);
        }}
        onCancel={() => setNotice(null)}
      />
      <ActivityGoalsSheet visible={editingGoals} goals={goals.data} onSave={goals.save} onClose={() => setEditingGoals(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 16 },
  hint: { fontSize: 12, textAlign: 'center' },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },
  list: { gap: 10, paddingBottom: 40 },
  heatmapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  heatmapText: { flex: 1, gap: 2 },
  heatmapTitle: { fontSize: 15, fontWeight: '700' },
});
