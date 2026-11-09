import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useDayTargets } from '@/src/features/program/data';
import { targetLine } from '@/src/features/program/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgramDay } from '@/src/lib/api/programs';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The next workout of the block with today's targets and why, and Start. */
export function NextWorkout({ day, onStart, starting, inProgress }: { day: ProgramDay; onStart: () => void; starting: boolean; inProgress: boolean }) {
  const c = useThemeColors();
  const { data, loading } = useDayTargets(day.id);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="program-next">
      <Text style={[styles.eyebrow, { color: c.mutedText }]}>NEXT WORKOUT</Text>
      <Text style={[styles.title, { color: c.text }]}>{day.title}</Text>
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {!loading && !data ? (
        <Text style={[styles.note, { color: c.mutedText }]}>{day.exercises} exercises. Targets show once you're online.</Text>
      ) : null}
      {data?.items.map((it, i) => (
        <View key={it.day_exercise_id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
          <View style={styles.rowHead}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{it.title || 'Exercise'}</Text>
            <Text style={[styles.target, { color: c.text }]}>{targetLine(it)}</Text>
          </View>
          {it.note ? <Text style={[styles.note, { color: c.mutedText }]}>{it.note}</Text> : null}
        </View>
      ))}
      <Button testID="program-start" title={inProgress ? 'Back to your workout' : `Start ${day.title}`} loading={starting} onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: type.weight.bold, fontSize: 20 },
  row: { paddingVertical: spacing.sm, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  target: { fontFamily: type.weight.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  note: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
});
