import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { SplitsList } from '@/src/features/roam/components/SplitsList';
import { RoamStatsPanel } from '@/src/features/roam/components/RoamStatsPanel';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { formatDistance, type ActivityType, type RoamStats } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  type: ActivityType;
  stats: RoamStats;
  elapsedSec: number;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
}

/** After Finish: review the Roam, then save or discard. Numbers are final once the server recomputes them. */
export function RecordingSummaryView({ type, stats, elapsedSec, saving, error, onSave, onDiscard }: Props) {
  const palette = useThemeColors();
  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>{ACTIVITY_LABEL[type].toUpperCase()} COMPLETE</Text>
        <RouteMap route={stats.route} vehicleRanges={stats.vehicleRanges} style={styles.map} />

        {stats.vehicleDetected ? (
          <VehicleBanner
            message={
              stats.xpEligible
                ? `${formatDistance(stats.vehicleDistanceM)} looked like vehicle travel and won't count.`
                : `Most of this Roam (${formatDistance(stats.vehicleDistanceM)}) looked like vehicle travel, so it won't earn XP.`
            }
          />
        ) : null}

        <RoamStatsPanel
          type={type}
          distanceM={stats.distanceM}
          movingSec={stats.movingTimeSec}
          elapsedSec={elapsedSec}
          avgPaceSecPerKm={stats.avgPaceSecPerKm}
          avgSpeedMps={stats.avgSpeedMps}
          maxSpeedMps={stats.maxSpeedMps}
          vehicleDetected={stats.vehicleDetected}
        />

        <SplitsList type={type} splits={stats.splits} distanceM={stats.distanceM} movingSec={stats.movingTimeSec} />

        {!stats.xpEligible && !stats.vehicleDetected ? (
          <Text style={[styles.note, { color: palette.mutedText }]}>
            Roams under 200 m or 1 minute of movement are saved but don't earn XP.
          </Text>
        ) : null}
        {error ? <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text> : null}
      </ScrollView>

      {/* Pinned, so the next step is always on screen however long the stats get. */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Button title="DISCARD" variant="ghost" onPress={onDiscard} disabled={saving} style={styles.discard} />
        <Button title="SAVE ROAM" onPress={onSave} loading={saving} style={styles.save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { gap: 14, paddingBottom: 16 },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  discard: { flex: 1 },
  save: { flex: 2 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  map: { height: 260 },
  note: { fontSize: 12, textAlign: 'center' },
});
