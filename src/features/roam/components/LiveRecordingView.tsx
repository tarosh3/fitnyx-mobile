import { Pause, Play, Square } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { StatTile } from '@/src/features/roam/components/StatTile';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { currentSpeedMps, formatDistance, formatDuration, formatSpeed } from '@/src/features/roam/geo';
import type { RoamRecording } from '@/src/features/roam/useRoamRecording';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  recording: RoamRecording;
  onFinish: () => void;
}

/** The live screen: map following you, big distance, time, speed, controls. */
export function LiveRecordingView({ recording, onFinish }: Props) {
  const palette = useThemeColors();
  const { meta, stats, elapsedMs } = recording;
  if (!meta) return null;
  const paused = meta.status === 'paused';
  // Speed in km/h for every Roam type (runs and walks too — not min/km pace).
  const rate = formatSpeed(stats?.avgSpeedMps ?? 0);
  // Live speed from the last few seconds of fixes (re-evaluated each second
  // with the clock). null = no recent fix; 0 = standing still.
  const now = paused ? null : currentSpeedMps(recording.points, (Date.now() - meta.startedAtMs) / 1000);
  const rateNow = now == null ? '--' : formatSpeed(now);
  const nowLabel = paused ? 'Paused' : now == null ? 'Finding GPS' : now === 0 ? 'Stopped' : 'Speed now';

  return (
    <View style={styles.wrap}>
      <RouteMap live route={stats?.route ?? NO_ROUTE} vehicleRanges={stats?.vehicleRanges} style={styles.map} />

      {stats?.inVehicleNow ? (
        <VehicleBanner message="Looks like you're in a vehicle — this stretch won't count toward your Roam." />
      ) : null}
      {paused ? (
        <Text style={[styles.paused, { color: palette.warning }]}>PAUSED — distance isn't recorded</Text>
      ) : null}

      <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <StatTile big label="Distance" value={formatDistance(stats?.distanceM ?? 0)} />
        <View style={styles.row}>
          <StatTile label="Time" value={formatDuration(elapsedMs / 1000)} />
          <StatTile label={nowLabel} value={rateNow} accent={!paused && now != null && now > 0} />
          <StatTile label="Avg speed" value={rate} />
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={paused ? recording.resume : recording.pause}
          style={[styles.control, { backgroundColor: palette.surface, borderColor: palette.border }]}
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={26} color={palette.text} /> : <Pause size={26} color={palette.text} />}
          <Text style={[styles.controlText, { color: palette.text }]}>{paused ? 'RESUME' : 'PAUSE'}</Text>
        </Pressable>
        <Pressable
          onPress={onFinish}
          style={[styles.control, { backgroundColor: palette.primary, borderColor: palette.primary }]}
          accessibilityLabel="Finish"
        >
          <Square size={22} color={palette.primaryText} fill={palette.primaryText} />
          <Text style={[styles.controlText, { color: palette.primaryText }]}>FINISH</Text>
        </Pressable>
      </View>
    </View>
  );
}

const NO_ROUTE: [number, number][] = []; // stable, so the memoized map doesn't re-render

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 12 },
  map: { flex: 1, minHeight: 220 },
  paused: { textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  panel: { borderRadius: 18, borderWidth: 1, paddingVertical: 8 },
  row: { flexDirection: 'row' },
  controls: { flexDirection: 'row', gap: 12 },
  control: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  controlText: { fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
});
