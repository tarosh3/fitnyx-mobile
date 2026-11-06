import { ArrowLeftRight, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { takenLabel, targetLine } from '@/src/features/workouts/today/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TodayItem } from '@/src/lib/api/todayWorkout';
import { radii, spacing, type } from '@/src/styles/tokens';

/** One exercise of today's workout: what to do, why that much, and a way out if the machine is taken. */
export function TodayItemCard({ item, onMachineTaken }: { item: TodayItem; onMachineTaken: () => void }) {
  const c = useThemeColors();
  return (
    <View testID={`today-item-${item.exercise_uuid}`} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.top}>
        <ExerciseThumb exercise={item.exercise} size={60} />
        <View style={styles.grow}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{item.exercise.title}</Text>
          <Text style={[styles.target, { color: c.text }]}>{targetLine(item)}</Text>
        </View>
      </View>
      <View style={styles.noteRow}>
        {item.kind === 'up' ? <TrendingUp size={16} color={c.accent} /> : null}
        <Text style={[styles.note, { color: item.kind === 'up' ? c.accent : c.mutedText }]}>{item.note}</Text>
      </View>
      <Pressable testID={`today-taken-${item.exercise_uuid}`} onPress={onMachineTaken} accessibilityRole="button" accessibilityLabel={`${takenLabel(item.exercise)} Find something instead of ${item.exercise.title}`}
        style={({ pressed }) => [styles.taken, { borderColor: c.border }, pressed && { opacity: 0.6 }]}>
        <ArrowLeftRight size={16} color={c.accent} />
        <Text style={[styles.takenText, { color: c.accent }]}>{takenLabel(item.exercise)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 17 },
  target: { fontFamily: type.weight.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  note: { flex: 1, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  taken: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth },
  takenText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
