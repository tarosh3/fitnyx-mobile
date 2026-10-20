import { Pencil, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activityGoals, formatGoal, GOAL_META, goalValue, type DayActivity } from '@/src/features/goals/model';
import { GOAL_ICONS } from '@/src/features/goals/ui/GoalRings';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Goals } from '@/src/lib/api/goals';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Roam start: today's goals as chips ("2.1 / 5 km"); tap to set or change them. */
export function RoamGoalsRow({ goals, day, onEdit }: { goals: Goals; day: DayActivity; onEdit: () => void }) {
  const c = useThemeColors();
  const list = activityGoals(goals);
  return (
    <Pressable testID="roam-goals" onPress={onEdit} accessibilityRole="button"
      accessibilityLabel={list.length
        ? `Today's goals: ${list.map((g) => `${GOAL_META[g.kind].label} ${formatGoal(g.kind, goalValue(g.kind, day))} of ${formatGoal(g.kind, g.target)}`).join(', ')}. Change goals`
        : 'Add a daily goal'}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.label, { color: c.mutedText }]}>TODAY’S GOALS</Text>
      <View style={styles.chips}>
        {list.map(({ kind, target }) => {
          const Icon = GOAL_ICONS[kind];
          return (
            <View key={kind} style={[styles.chip, { borderColor: c.goals[kind], backgroundColor: c.card }]}>
              <Icon size={15} color={c.goals[kind]} />
              <Text style={[styles.chipText, { color: c.text }]}>
                {formatGoal(kind, goalValue(kind, day), false)}<Text style={{ color: c.mutedText }}> / {formatGoal(kind, target, kind !== 'steps')}</Text>
              </Text>
            </View>
          );
        })}
        <View style={[styles.chip, styles.add, { borderColor: c.border }]}>
          {list.length ? <Pencil size={14} color={c.mutedText} /> : <Plus size={15} color={c.mutedText} />}
          <Text style={[styles.chipText, { color: c.mutedText }]}>{list.length ? 'Edit' : 'Add a goal'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  pressed: { opacity: 0.8 },
  label: { fontSize: 12, fontFamily: type.weight.extrabold, letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, minHeight: 36 },
  add: { borderStyle: 'dashed' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
});
