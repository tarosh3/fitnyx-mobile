import { Plus, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExerciseGroup } from '@/src/features/workouts/history/useSessionDetail';
import { describeSet, trackingOf } from '@/src/features/workouts/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const EFFORT: Record<number, string> = { 6: 'Easy', 7: 'OK', 8: 'Hard', 9: 'Very hard', 10: 'Max' };

/** A finished exercise: every set on its own line (never merged), tap to fix one. */
export function LoggedGroup({ group, onOpenExercise, onEditSet, onAddSet }: {
  group: ExerciseGroup;
  onOpenExercise: () => void;
  onEditSet: (logId: string) => void;
  onAddSet: () => void;
}) {
  const c = useThemeColors();
  const t = trackingOf(group.exercise);
  const name = group.exercise?.title ?? 'Exercise';
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={onOpenExercise} accessibilityRole="button" accessibilityLabel={`${name}. How to do it`} style={styles.head}>
        <ExerciseThumb exercise={group.exercise} size={48} />
        <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{name}</Text>
      </Pressable>
      {group.logs.map((l, i) => {
        const effort = l.rpe ? EFFORT[Math.round(l.rpe)] ?? `RPE ${l.rpe}` : null;
        return (
          <Pressable key={l.id} onPress={() => onEditSet(l.id)} accessibilityRole="button"
            accessibilityLabel={`Set ${i + 1}: ${describeSet(t, l)}${effort ? `, ${effort}` : ''}${l.is_pr ? ', new best' : ''}. Change`}
            style={({ pressed }) => [styles.set, { backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.n, { color: c.mutedText }]}>{i + 1}</Text>
            <Text style={[styles.value, { color: c.text }]}>{describeSet(t, l)}</Text>
            {effort ? <Text style={[styles.effort, { color: c.mutedText }]}>{effort}</Text> : null}
            {l.is_pr ? <Trophy size={18} color={c.parts.shoulders.fg} /> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={onAddSet} accessibilityRole="button" accessibilityLabel={`Add a set to ${name}`}
        style={({ pressed }) => [styles.add, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        <Plus size={18} color={c.text} /><Text style={[styles.addText, { color: c.text }]}>Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  name: { flex: 1, fontFamily: type.weight.bold, fontSize: 17 },
  set: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md },
  n: { width: 20, fontFamily: type.weight.bold, fontSize: 15, textAlign: 'center' },
  value: { flex: 1, fontFamily: type.weight.semibold, fontSize: 16, fontVariant: ['tabular-nums'] },
  effort: { fontFamily: type.weight.medium, fontSize: 14 },
  add: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
