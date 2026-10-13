import { Dumbbell, HeartPulse, PersonStanding, Timer } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Part } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TrackingType } from '@/src/types/exercise';
import { type } from '@/src/styles/tokens';

/** Overlapping coloured circles previewing a workout's exercises. */
export function Avatars({ items, max = 5, ring }: { items: { part: Part; tracking: TrackingType }[]; max?: number; ring: string }) {
  const c = useThemeColors();
  const more = items.length - max;
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {items.slice(0, max).map((it, i) => {
        const tone = c.parts[it.part];
        const Icon = it.tracking === 'cardio' ? HeartPulse : it.tracking === 'duration' ? Timer : it.tracking === 'reps' ? PersonStanding : Dumbbell;
        return (
          <View key={i} style={[styles.av, { backgroundColor: tone.bg, borderColor: ring }]}>
            <Icon size={16} color={tone.fg} />
          </View>
        );
      })}
      {more > 0 ? (
        <View style={[styles.av, { backgroundColor: c.surface, borderColor: ring }]}>
          <Text style={[styles.more, { color: c.mutedText }]}>+{more}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingLeft: 10 },
  av: { width: 36, height: 36, borderRadius: 18, marginLeft: -10, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  more: { fontFamily: type.weight.extrabold, fontSize: 12 },
});
