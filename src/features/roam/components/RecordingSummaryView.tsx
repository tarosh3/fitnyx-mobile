import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { SplitsList } from '@/src/features/roam/components/SplitsList';
import { StatTile } from '@/src/features/roam/components/StatTile';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { formatDistance, formatDuration, formatPace, formatSpeed, type ActivityType, type RoamStats } from '@/src/features/roam/geo';
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
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.text }]}>{ACTIVITY_LABEL[type].toUpperCase()} COMPLETE</Text>
      <RouteMap route={stats.route} vehicleRanges={stats.vehicleRanges} style={styles.map} />

      {stats.vehicleDetected ? (
        <VehicleBanner message={`${formatDistance(stats.vehicleDistanceM)} looked like vehicle travel and won't count.`} />
      ) : null}

      <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.row}>
          <StatTile label="Distance" value={formatDistance(stats.distanceM)} />
          <StatTile label="Moving time" value={formatDuration(stats.movingTimeSec)} />
        </View>
        <View style={styles.row}>
          <StatTile
            label={type === 'cycle' ? 'Avg speed' : 'Avg pace'}
            value={type === 'cycle' ? formatSpeed(stats.avgSpeedMps) : formatPace(stats.avgPaceSecPerKm)}
          />
          <StatTile label="Total time" value={formatDuration(elapsedSec)} />
        </View>
      </View>

      <SplitsList splits={stats.splits} />

      {!stats.xpEligible && !stats.vehicleDetected ? (
        <Text style={[styles.note, { color: palette.mutedText }]}>
          Roams under 200 m or 1 minute of movement are saved but don't earn XP.
        </Text>
      ) : null}
      {error ? <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text> : null}

      <Button title="SAVE ROAM" onPress={onSave} loading={saving} />
      <Button title="DISCARD" variant="ghost" onPress={onDiscard} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  map: { height: 260 },
  panel: { borderRadius: 18, borderWidth: 1, paddingVertical: 8 },
  row: { flexDirection: 'row' },
  note: { fontSize: 12, textAlign: 'center' },
});
