import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { ActivityStats } from '@/src/features/roam/components/ActivityStats';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { SplitsList } from '@/src/features/roam/components/SplitsList';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { decodePolyline, formatDistance } from '@/src/features/roam/geo';
import { retentionMetricsKey } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { isAuthError } from '@/src/lib/api';
import { deleteActivity, getActivity, type ActivityDetail } from '@/src/lib/api/activities';
import { cacheGet, cacheInvalidate, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

export default function RoamDetailScreen() {
  const palette = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = Array.isArray(id) ? id[0] : id;
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.id || !activityId) return;
    const key = cacheKeys.roamActivity(user.id, activityId);
    let cancelled = false;
    (async () => {
      const cached = await cacheGet<ActivityDetail>(key);
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
        if (!cancelled && !isAuthError(e)) setError('Could not load this Roam.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activityId]);

  const route = useMemo(() => (activity ? decodePolyline(activity.route_polyline) : []), [activity]);

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
    <Screen>
      <PageHeader title={ACTIVITY_LABEL[activity.activity_type].toUpperCase()} subtitle={date.toUpperCase()} backTo="/roam" />
      <View style={styles.content}>
        <RouteMap route={route} vehicleRanges={activity.vehicle_ranges} style={styles.map} />
        {activity.vehicle_detected ? (
          <VehicleBanner
            message={`${formatDistance(activity.vehicle_distance_m)} was vehicle travel and isn't counted${activity.xp_eligible ? '' : ' — this Roam earned no XP'}.`}
          />
        ) : null}
        <ActivityStats activity={activity} />
        <SplitsList type={activity.activity_type} splits={activity.splits} distanceM={activity.distance_m} movingSec={activity.moving_time_sec} />
        {error ? <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text> : null}
        <Button title="DELETE ROAM" variant="ghost" onPress={() => setConfirmDelete(true)} loading={deleting} />
      </View>
      <ConfirmModal
        visible={confirmDelete}
        title="DELETE ROAM?"
        message="This removes the route and any XP it earned."
        confirmLabel="DELETE"
        variant="danger"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  map: { height: 300 },
  note: { fontSize: 12, textAlign: 'center' },
});
