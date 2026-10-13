import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Part } from '@/src/features/workouts/model';
import { PlatesDeco } from '@/src/features/workouts/ui/Hero';
import { Pill } from '@/src/features/workouts/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { WorkoutPlanWithDays } from '@/src/lib/api/workoutPlans';
import { radii, spacing, type } from '@/src/styles/tokens';

const GOAL_LABEL: Record<string, string> = {
  muscle_gain: 'Build muscle', fat_loss: 'Lose fat', strength: 'Get stronger', endurance: 'Endurance', general_fitness: 'General fitness',
};
const GOAL_TONE: Record<string, Part> = { muscle_gain: 'legs', fat_loss: 'cardio', strength: 'back', endurance: 'chest', general_fitness: 'core' };

export function trainingDays(p: WorkoutPlanWithDays): number {
  return (p.days ?? []).filter((d) => !d.is_rest_day).length;
}
export function goalLabel(goal?: string | null): string {
  return (goal && GOAL_LABEL[goal]) || 'All-round';
}

/** A ready-made program with a coloured band and its weekly rhythm. */
export function ProgramCard({ program, active }: { program: WorkoutPlanWithDays; active?: boolean }) {
  const c = useThemeColors();
  const router = useRouter();
  const tone = c.parts[GOAL_TONE[program.goal ?? ''] ?? 'core'];
  const days = trainingDays(program);
  return (
    <Pressable onPress={() => router.push(`/workouts/programs/${program.id}`)} accessibilityRole="button"
      accessibilityLabel={`${program.title}, ${days} workouts a week. Open program`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.band, { backgroundColor: tone.bg }]}>
        <PlatesDeco color={tone.fg} size={210} style={styles.deco} />
        <View style={styles.bandText}>
          <Text style={[styles.big, { color: tone.fg }]}>{days}×</Text>
          <Text style={[styles.bandLabel, { color: tone.fg }]}>workouts{'\n'}a week</Text>
        </View>
      </View>
      <View style={styles.pills}>
        <Pill>{goalLabel(program.goal)}</Pill>
        {active ? <Pill tone="ok">Active</Pill> : null}
      </View>
      <Text style={[styles.title, { color: c.text }]}>{program.title}</Text>
      {program.description ? <Text style={[styles.desc, { color: c.mutedText }]} numberOfLines={2}>{program.description}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  band: { height: 92, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end', padding: spacing.md },
  deco: { position: 'absolute', right: -64, top: -76, opacity: 0.35 },
  bandText: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  big: { fontFamily: type.weight.extrabold, fontSize: 40, lineHeight: 42, letterSpacing: -1 },
  bandLabel: { fontFamily: type.weight.bold, fontSize: 13, lineHeight: 16, marginBottom: 4 },
  pills: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  title: { fontFamily: type.weight.extrabold, fontSize: 19, paddingHorizontal: 4 },
  desc: { fontFamily: type.weight.regular, fontSize: 14, paddingHorizontal: 4, paddingBottom: 4 },
});
