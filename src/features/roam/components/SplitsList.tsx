import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPace } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Per-km times with a bar relative to the fastest split. */
export function SplitsList({ splits }: { splits: { km: number; sec: number }[] }) {
  const palette = useThemeColors();
  if (splits.length === 0) return null;
  const fastest = Math.min(...splits.map((s) => s.sec));
  return (
    <View style={styles.list}>
      <Text style={[styles.title, { color: palette.mutedText }]}>SPLITS</Text>
      {splits.map((s) => (
        <View key={s.km} style={styles.row}>
          <Text style={[styles.km, { color: palette.mutedText }]}>{s.km} km</Text>
          <View style={[styles.track, { backgroundColor: palette.border }]}>
            <View
              style={[styles.bar, { backgroundColor: palette.primary, width: `${Math.max(15, (fastest / s.sec) * 100)}%` }]}
            />
          </View>
          <Text style={[styles.pace, { color: palette.text }]}>{formatPace(s.sec)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  km: { width: 44, fontSize: 12, fontWeight: '700' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  pace: { width: 76, textAlign: 'right', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
