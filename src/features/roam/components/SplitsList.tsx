import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPace, formatSpeed, type ActivityType } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  type: ActivityType;
  splits: { km: number; sec: number }[];
  /** Totals, to show the last partial km (e.g. the 0.99 km after 4 full ones). */
  distanceM: number;
  movingSec: number;
}

/** Per-km times with a bar relative to the fastest split. */
export function SplitsList({ type, splits, distanceM, movingSec }: Props) {
  const palette = useThemeColors();
  if (splits.length === 0) return null;
  const fastest = Math.min(...splits.map((s) => s.sec));
  const fastestIndex = splits.findIndex((s) => s.sec === fastest); // first one on a tie
  // A ride reads in km/h everywhere else, so its splits do too.
  const rate = (secPerKm: number) => (type === 'cycle' ? formatSpeed(1000 / secPerKm) : formatPace(secPerKm));
  const restM = distanceM - splits.length * 1000;
  const restSec = movingSec - splits.reduce((t, s) => t + s.sec, 0);
  const rest = restM >= 50 && restSec > 0 ? { km: restM / 1000, pace: restSec / (restM / 1000) } : null;
  return (
    <View style={styles.list}>
      <Text style={[styles.title, { color: palette.mutedText }]}>{type === 'cycle' ? 'SPLITS · SPEED PER KM' : 'SPLITS · PACE PER KM'}</Text>
      {splits.map((s, i) => {
        // Only the fastest km is in full colour, so the eye finds it at once.
        const best = splits.length > 1 && i === fastestIndex;
        return (
          <View key={s.km} style={styles.row}>
            <Text style={[styles.km, { color: palette.mutedText }]}>{s.km} km</Text>
            <View style={[styles.track, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: palette.primary, opacity: best ? 1 : 0.45 },
                  { width: `${Math.max(15, (fastest / s.sec) * 100)}%` },
                ]}
              />
            </View>
            <Text style={[styles.pace, { color: best ? palette.primary : palette.text }]}>
              {rate(s.sec)}
            </Text>
          </View>
        );
      })}
      {rest ? (
        <View style={styles.row}>
          <Text style={[styles.km, { color: palette.mutedText }]}>{rest.km.toFixed(2)} km</Text>
          <View style={[styles.track, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.bar,
                { backgroundColor: palette.primary, opacity: 0.45 },
                { width: `${Math.min(100, Math.max(15, (fastest / rest.pace) * 100))}%` },
              ]}
            />
          </View>
          <Text style={[styles.pace, { color: palette.text }]}>{rate(rest.pace)}</Text>
        </View>
      ) : null}
      {splits.length > 1 ? (
        <Text style={[styles.legend, { color: palette.mutedText }]}>Highlighted: your fastest km</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  km: { width: 58, fontSize: 12, fontWeight: '700' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  pace: { width: 76, textAlign: 'right', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  legend: { fontSize: 11, marginTop: 2 },
});
