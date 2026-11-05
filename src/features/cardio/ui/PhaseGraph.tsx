import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { zoneOf } from '@/src/features/cardio/engine';
import type { Phase } from '@/src/features/cardio/programs';

const effort = (p: Phase) => p.pace + (p.climb ?? 0) * 0.035;

/** The whole program at a glance: one bar per phase, wide as its time, tall as its effort. */
export function PhaseGraph({ phases, height = 56, progress, testID }: { phases: Phase[]; height?: number; progress?: number; testID?: string }) {
  const c = useThemeColors();
  const min = 0.35;
  const max = Math.max(...phases.map(effort), 1);
  return (
    <View testID={testID} style={[styles.row, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {phases.map((p, i) => (
        <View key={i} style={[styles.bar, { flexGrow: p.sec, height: `${Math.round(((effort(p) - min) / (max - min)) * 75 + 25)}%`, backgroundColor: c.routeRamp[zoneOf(p)] }]} />
      ))}
      {progress != null ? (
        <>
          <View style={[styles.past, { width: `${progress * 100}%`, backgroundColor: c.background }]} />
          <View style={[styles.head, { left: `${progress * 100}%`, backgroundColor: c.text }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, overflow: 'hidden', borderRadius: 6 },
  bar: { flexBasis: 0, minWidth: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  past: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.6 },
  head: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
});
