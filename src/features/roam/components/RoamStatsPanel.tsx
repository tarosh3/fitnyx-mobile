import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatTile } from '@/src/features/roam/components/StatTile';
import {
  formatDistance,
  formatDurationHuman,
  formatPace,
  formatSpeed,
  type ActivityType,
} from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export interface RoamStatsPanelProps {
  type: ActivityType;
  distanceM: number;
  movingSec: number;
  /** Start to finish, including stops. */
  elapsedSec: number;
  avgPaceSecPerKm: number | null;
  avgSpeedMps: number;
  maxSpeedMps: number;
  /** Vehicle time also falls outside moving time, so it isn't just "stopped". */
  vehicleDetected?: boolean;
  /** Earned XP once saved; omitted on the pre-save review (the server decides it). */
  xp?: { earned: number; eligible: boolean };
}

/**
 * The metrics of one Roam, shared by the post-run review and the saved Roam so
 * both read the same. Distance leads; the grid uses one unit family (pace on
 * foot, speed on a bike) and a caption explains moving vs start-to-finish time.
 */
export function RoamStatsPanel(p: RoamStatsPanelProps) {
  const palette = useThemeColors();
  const cycle = p.type === 'cycle';
  const fastestPace = p.maxSpeedMps > 0 ? 1000 / p.maxSpeedMps : null;
  const stoppedSec = Math.max(0, p.elapsedSec - p.movingSec);
  const stopped =
    stoppedSec >= 5
      ? `${formatDurationHuman(stoppedSec)} ${p.vehicleDetected ? 'not counted (stops + vehicle)' : 'stopped'}`
      : null;
  // With an XP tile, elapsed time moves into the caption; otherwise it has its own tile.
  const caption = p.xp
    ? [`${formatDurationHuman(p.elapsedSec)} from start to finish`, stopped].filter(Boolean).join(' · ')
    : stopped && (p.vehicleDetected ? stopped : `${stopped} — not counted in your pace`);

  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <StatTile big label="Distance" value={formatDistance(p.distanceM)} />
      <View style={[styles.divider, { backgroundColor: palette.border }]} />
      <View style={styles.row}>
        <StatTile label="Moving time" value={formatDurationHuman(p.movingSec)} />
        <StatTile
          label={cycle ? 'Avg speed' : 'Avg pace'}
          value={cycle ? formatSpeed(p.avgSpeedMps) : formatPace(p.avgPaceSecPerKm)}
        />
      </View>
      <View style={styles.row}>
        <StatTile
          label={cycle ? 'Top speed' : 'Fastest pace'}
          value={cycle ? formatSpeed(p.maxSpeedMps) : formatPace(fastestPace)}
        />
        {p.xp ? (
          <StatTile label="XP earned" value={p.xp.eligible ? `+${p.xp.earned}` : '—'} />
        ) : (
          <StatTile label="Elapsed" value={formatDurationHuman(p.elapsedSec)} />
        )}
      </View>
      {caption ? <Text style={[styles.caption, { color: palette.mutedText }]}>{caption}</Text> : null}
      {!cycle ? (
        <Text style={[styles.caption, { color: palette.mutedText }]}>
          Pace = time per km — lower is faster. Fastest = your quickest 10 seconds.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, gap: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12, marginVertical: 6 },
  row: { flexDirection: 'row' },
  caption: { fontSize: 11, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
});
