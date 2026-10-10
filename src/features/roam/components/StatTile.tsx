import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

/** One labelled metric (distance, time, pace…). `big` for the live hero value. */
export function StatTile({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  const palette = useThemeColors();
  return (
    // flex:1 shares a row equally; the big hero tile stacks in a column, where
    // flex:1 with no parent height collapses it to 0 — so it sizes to content.
    <View style={[styles.tile, big && styles.stacked]}>
      <Text style={[big ? styles.big : styles.value, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: palette.mutedText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  stacked: { flex: 0 },
  value: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  big: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' },
});
