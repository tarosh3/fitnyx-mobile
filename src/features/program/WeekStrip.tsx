import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { weekStrip } from '@/src/features/program/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

/** The block at a glance: one bar per week, lighter and test weeks marked. */
export function WeekStrip({ weeks, week, finished, compact = false }: { weeks: number; week: number; finished: boolean; compact?: boolean }) {
  const c = useThemeColors();
  const strip = weekStrip(weeks, week, finished);
  const lighter = strip.filter((w) => w.kind === 'deload').map((w) => w.week);
  return (
    <View style={styles.wrap} accessibilityLabel={`Week ${Math.min(week, weeks)} of ${weeks}`} testID="week-strip">
      <View style={styles.row}>
        {strip.map((w) => (
          <View key={w.week} style={[
            styles.bar,
            { height: compact ? 6 : 10, backgroundColor: w.state === 'next' ? c.border : c.primary },
            w.kind === 'deload' && { opacity: w.state === 'next' ? 0.6 : 0.55 },
            w.state === 'now' && { borderWidth: 2, borderColor: c.accent, height: compact ? 8 : 14 },
          ]} />
        ))}
      </View>
      {compact ? null : (
        <Text style={[styles.legend, { color: c.mutedText }]}>
          {lighter.length ? `Lighter ${lighter.length > 1 ? 'weeks' : 'week'} ${lighter.join(', ')} · ` : ''}Test week {weeks}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bar: { flex: 1, borderRadius: 4 },
  legend: { fontFamily: type.weight.medium, fontSize: 12 },
});
