import { PartyPopper } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { addActivity, GOAL_META, goalValue, type DayActivity } from '@/src/features/goals/model';
import { GoalRingsRow } from '@/src/features/goals/ui/GoalRings';
import type { GoalTracker } from '@/src/features/roam/goalTracker';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Review screen: today's goals with this Roam added, celebrating any it completed. */
export function RoamGoalsSummary({ tracker, roam }: { tracker: GoalTracker; roam: DayActivity }) {
  const palette = useThemeColors();
  if (!tracker.goals.length) return null;
  const day = addActivity(tracker.before, roam);
  // Reached with this Roam (not already before it).
  const reached = tracker.goals.filter((g) => goalValue(g.kind, day) >= g.target && goalValue(g.kind, tracker.before) < g.target);
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: reached.length ? palette.primary : palette.border }]}>
      {reached.length ? (
        <View style={styles.head} accessible accessibilityRole="header">
          <PartyPopper size={18} color={palette.primary} />
          <Text style={[styles.title, { color: palette.text }]}>
            {reached.length === tracker.goals.length ? 'Every goal reached today!' : `${reached.map((g) => GOAL_META[g.kind].label).join(' & ')} goal reached!`}
          </Text>
        </View>
      ) : (
        <Text style={[styles.label, { color: palette.mutedText }]}>TODAY’S GOALS WITH THIS ROAM</Text>
      )}
      <GoalRingsRow goals={tracker.goals} day={day} size={60} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 16, fontFamily: type.weight.extrabold },
  label: { textAlign: 'center', fontSize: 11, fontFamily: type.weight.extrabold, letterSpacing: 1.2 },
});
