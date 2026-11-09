import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ghost, Pencil, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { RoamCompletionHero } from '@/src/features/roam/components/RoamCompletionHero';
import { CompletionRewards } from '@/src/features/completion/CompletionRewards';
import { BottomBar, Button as FooterButton } from '@/src/features/workouts/ui/Chrome';
import { type } from '@/src/styles/tokens';
import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { activityTitle, cleanActivityName, defaultActivityName } from '@/src/features/roam/activityName';
import { useFeatureFlag } from '@/src/features/appConfig/store';
import { useProGate } from '@/src/features/pro/gate';
import { useProgressSummary } from '@/src/features/progress/data';
import { ActivityStats } from '@/src/features/roam/components/ActivityStats';
import { BestEfforts } from '@/src/features/roam/components/BestEfforts';
import { RaceResultCard } from '@/src/features/roam/components/GhostCards';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { RenameRoamSheet } from '@/src/features/roam/components/RenameRoamSheet';
import { RoamReplay } from '@/src/features/roam/components/RoamReplay';
import { SplitsList } from '@/src/features/roam/components/SplitsList';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { formatDistance } from '@/src/features/roam/geo';
import { buildGhost } from '@/src/features/roam/ghost';
import { getRaceResult, setPendingRace, type RaceResult } from '@/src/features/roam/ghostStore';
import { roamCardData } from '@/src/features/share/cardData';
import { ShareCardSheet } from '@/src/features/share/ShareCardSheet';
import { retentionMetricsKey } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { isAuthError } from '@/src/lib/api';
import {
  deleteActivity,
  getActivity,
  renameActivity,
  type ActivityDetail,
  type ActivityListResponse,
} from '@/src/lib/api/activities';
import { cacheGetStale, cacheInvalidate, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

export default function RoamDetailScreen() {
  const palette = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // `new`: just saved from the review screen. Opened later from a list, it isn't a finish line.
  const { id, new: justSaved } = useLocalSearchParams<{ id: string; new?: string }>();
  const fresh = justSaved === '1';
  const activityId = Array.isArray(id) ? id[0] : id;
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [race, setRace] = useState<RaceResult | null>(null);
  const racing = useFeatureFlag('roam_ghost', true);
  const proGate = useProGate();
  const summary = useProgressSummary(user?.id);

  useEffect(() => {
    if (activityId) getRaceResult(activityId).then(setRace);
  }, [activityId]);

  // Back to the Roam screen underneath with this Roam picked as the ghost.
  const raceThis = () => {
    if (!activity) return;
    if (!proGate.isPro) return proGate.openPro();
    setPendingRace(buildGhost(activity, activityTitle(activity)));
    router.dismissTo('/roam');
  };

  useEffect(() => {
    if (!user?.id || !activityId) return;
    const key = cacheKeys.roamActivity(user.id, activityId);
    let cancelled = false;
    (async () => {
      const cached = await cacheGetStale<ActivityDetail>(key);
      if (cached) {
        if (!cancelled) setActivity(cached);
        return; // a saved Roam never changes
      }
      try {
        const fresh = await getActivity(activityId);
        if (cancelled) return;
        setActivity(fresh);
        await cacheSet(key, fresh, cacheTTL.DAY);
      } catch (e) {
        if (!cancelled && !isAuthError(e)) {
          setError(
            (e as { status?: number })?.status
              ? 'Could not load this Roam.'
              : "You're offline. Open this Roam once while online to keep it available offline.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activityId]);

  const onRename = async (raw: string) => {
    if (!activity || !user?.id) return;
    const cleaned = cleanActivityName(raw);
    // The default title isn't stored — saving it (or blank) clears the name.
    const name = cleaned === defaultActivityName(activity.activity_type, activity.started_at) ? '' : cleaned;
    if ((activity.name ?? '') === name) return setRenaming(false);
    setRenameSaving(true);
    setRenameError(null);
    try {
      const updated = { ...activity, ...(await renameActivity(activity.id, name)) };
      setActivity(updated);
      await cacheSet(cacheKeys.roamActivity(user.id, activity.id), updated, cacheTTL.DAY);
      // Patch the history list's offline copy too, so it shows the new name at once.
      const listKey = cacheKeys.roamActivities(user.id);
      const list = await cacheGetStale<ActivityListResponse>(listKey);
      if (list) {
        const data = list.data.map((a) => (a.id === activity.id ? { ...a, name: updated.name ?? null } : a));
        await cacheSet(listKey, { ...list, data }, cacheTTL.LONG);
      }
      setRenaming(false);
    } catch (e) {
      setRenameError(
        (e as { status?: number })?.status ? "Couldn't rename this Roam. Try again." : "You're offline. Connect to rename this Roam.",
      );
    } finally {
      setRenameSaving(false);
    }
  };

  const onDelete = async () => {
    if (!activityId || !user?.id) return;
    setDeleting(true);
    try {
      await deleteActivity(activityId);
      await cacheInvalidate(cacheKeys.roamActivity(user.id, activityId));
      await cacheInvalidate(cacheKeys.roamActivities(user.id));
      queryClient.invalidateQueries({ queryKey: retentionMetricsKey(user.id) }); // its XP is gone
      router.dismissTo('/roam'); // the list underneath, not a second copy
    } catch {
      setError('Could not delete this Roam. Try again.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!activity) {
    return (
      <Screen>
        <PageHeader title="ROAM" backTo="/roam" />
        {error ? (
          <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text>
        ) : (
          <ActivityIndicator color={palette.primary} />
        )}
      </Screen>
    );
  }

  const date = new Date(activity.started_at).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
    <Screen style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 20 }}>
      <PageHeader title="Activity" backTo="/roam" />
      <View style={styles.content}>
        <RoamCompletionHero eyebrow={fresh ? `${ACTIVITY_LABEL[activity.activity_type]} saved` : ACTIVITY_LABEL[activity.activity_type]} done={fresh} subtitle={date} seed={activity.id}
          distanceM={activity.distance_m} movingSec={activity.moving_time_sec} avgSpeedMps={activity.avg_speed_mps}
          title={
        <Pressable
          testID="roam-title"
          accessibilityRole="button"
          accessibilityLabel={`${activityTitle(activity)}. Rename`}
          onPress={() => {
            setRenameError(null);
            setRenaming(true);
          }}
          style={({ pressed }) => [styles.titleRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {activityTitle(activity)}
          </Text>
          <Pencil size={18} color={palette.accent} />
        </Pressable>
          }
        />
        <CompletionRewards screen="roam" seed={activity.id} xp={activity.xp} eligible={activity.xp_eligible} />
        {race ? (
          <RaceResultCard ghost={{ title: race.ghostTitle, startedAt: race.ghostStartedAt }} ghostDistanceM={race.ghostDistanceM}
            myDistanceM={activity.distance_m} state={race.state} />
        ) : null}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Your route</Text>
        <RoamReplay activity={activity} />
        {racing && activity.distance_m >= 200 ? (
          <FooterButton title={proGate.locked ? "Race this Roam · Pro" : "Race this Roam"} variant="secondary" icon={<Ghost size={18} color={palette.text} />} onPress={raceThis} />
        ) : null}
        {activity.vehicle_detected ? (
          <VehicleBanner
            message={`${formatDistance(activity.vehicle_distance_m)} was vehicle travel and isn't counted${activity.xp_eligible ? '' : ' — this Roam earned no XP'}.`}
          />
        ) : null}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>The details</Text>
        <ActivityStats activity={activity} />
        <BestEfforts activityId={activity.id} splits={activity.splits} records={summary.data?.records.efforts} />
        <SplitsList splits={activity.splits} distanceM={activity.distance_m} movingSec={activity.moving_time_sec} />
        {error ? <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text> : null}
        <Button title="DELETE ROAM" variant="ghost" textStyle={{ color: palette.destructive }} onPress={() => setConfirmDelete(true)} loading={deleting} />
      </View>
    </Screen>
    <BottomBar position="relative">
      <FooterButton variant="secondary" title="Share" icon={<Share2 size={18} color={palette.text} />} onPress={() => setSharing(true)} style={fresh ? { flexGrow: 0 } : undefined} />
      {fresh ? <FooterButton title="Done" onPress={() => router.dismissTo('/roam')} /> : null}
    </BottomBar>
      <ShareCardSheet visible={sharing} data={sharing ? roamCardData(activity) : null} onClose={() => setSharing(false)} />
      <RenameRoamSheet
        visible={renaming}
        initialName={activity.name ?? ''}
        defaultName={defaultActivityName(activity.activity_type, activity.started_at)}
        saving={renameSaving}
        error={renameError}
        onSave={onRename}
        onCancel={() => setRenaming(false)}
      />
      <ConfirmModal
        visible={confirmDelete}
        title="DELETE ROAM?"
        message="This removes the route and any XP it earned."
        confirmLabel="DELETE"
        variant="danger"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  title: { flex: 1, fontSize: 27, fontFamily: type.weight.bold, letterSpacing: -0.9 },
  sectionTitle: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: -0.4, marginBottom: -8 },
  note: { fontSize: 12, textAlign: 'center' },
});
