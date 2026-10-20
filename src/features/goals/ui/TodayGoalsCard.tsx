import { useRouter } from 'expo-router';
import { ArrowRight, Pencil, Target } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGoals, useTodayActivity } from '@/src/features/goals/data';
import { activityGoals, goalValue } from '@/src/features/goals/model';
import { ActivityGoalsSheet } from '@/src/features/goals/ui/ActivityGoalsSheet';
import { GoalRingsRow } from '@/src/features/goals/ui/GoalRings';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Home: today's distance / calories / steps against the daily goals. */
export function TodayGoalsCard() {
  const c = useThemeColors();
  const router = useRouter();
  const goals = useGoals();
  const { day } = useTodayActivity();
  const [editing, setEditing] = useState(false);
  const list = activityGoals(goals.data);
  // Before the first load (or on an older backend) there is nothing to show.
  if (!goals.data) return null;
  const done = list.filter((g) => goalValue(g.kind, day) >= g.target).length;

  return (
    <View testID="home-goals-card" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>TODAY’S GOALS</Text>
        {list.length ? (
          <Pressable testID="home-goals-edit" onPress={() => setEditing(true)} hitSlop={12} accessibilityRole="button"
            accessibilityLabel="Edit daily goals" style={styles.edit}>
            <Pencil size={17} color={c.mutedText} />
          </Pressable>
        ) : null}
      </View>

      {list.length ? (
        <>
          <Text style={[styles.title, { color: c.text }]}>
            {done === list.length ? 'All goals reached today' : done > 0 ? `${done} of ${list.length} reached` : 'Keep moving'}
          </Text>
          <GoalRingsRow goals={list} day={day} />
          <Pressable onPress={() => router.push('/roam')} accessibilityRole="button" accessibilityLabel="Start a Roam"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text style={[styles.linkText, { color: c.accent }]}>Start a Roam</Text>
            <ArrowRight size={16} color={c.accent} />
          </Pressable>
        </>
      ) : (
        <Pressable testID="home-goals-set" onPress={() => setEditing(true)} accessibilityRole="button"
          accessibilityLabel="Set daily goals for distance, calories or steps"
          style={({ pressed }) => [styles.empty, pressed && styles.pressed]}>
          <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}><Target size={22} color={c.accent} /></View>
          <View style={styles.emptyCopy}>
            <Text style={[styles.title, { color: c.text }]}>Set a daily goal</Text>
            <Text style={[styles.body, { color: c.mutedText }]}>Distance, calories burned or steps, tracked live on every Roam.</Text>
          </View>
          <ArrowRight size={18} color={c.mutedText} />
        </Pressable>
      )}

      <ActivityGoalsSheet visible={editing} goals={goals.data} onSave={goals.save} onClose={() => setEditing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.md, marginTop: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.xs, letterSpacing: type.tracking.eyebrow },
  edit: { minWidth: 32, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  title: { fontFamily: type.weight.bold, fontSize: 18 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  linkText: { fontFamily: type.weight.semibold, fontSize: 15 },
  pressed: { opacity: 0.8 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { flex: 1, gap: 2 },
});
