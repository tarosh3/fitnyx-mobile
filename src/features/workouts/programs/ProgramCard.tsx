import { useRouter } from 'expo-router';
import { ArrowUpRight, Check } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Part } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { WorkoutPlanWithDays } from '@/src/lib/api/workoutPlans';
import { radii, spacing, type } from '@/src/styles/tokens';

const GOAL_LABEL: Record<string, string> = {
  muscle_gain: 'Build muscle', fat_loss: 'Lose fat', strength: 'Get stronger', endurance: 'Endurance', general_fitness: 'General fitness',
};
const GOAL_TONE: Record<string, Part> = { muscle_gain: 'legs', fat_loss: 'cardio', strength: 'back', endurance: 'chest', general_fitness: 'core' };
const STRENGTH_ART = require('../../../../assets/images/workouts/strength-equipment.png');
const CARDIO_ART = require('../../../../assets/images/workouts/cardio-shoe.png');

export function trainingDays(p: WorkoutPlanWithDays): number {
  return (p.days ?? []).filter((d) => !d.is_rest_day).length;
}
export function goalLabel(goal?: string | null): string {
  return (goal && GOAL_LABEL[goal]) || 'All-round';
}

/** A program's goal and weekly rhythm, with equipment artwork rather than a trainer portrait. */
export function ProgramCard({ program, active }: { program: WorkoutPlanWithDays; active?: boolean }) {
  const c = useThemeColors();
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  const tone = c.parts[GOAL_TONE[program.goal ?? ''] ?? 'back'];
  const days = trainingDays(program);
  const isCardio = program.goal === 'endurance' || program.goal === 'cardio';
  const roomyText = fontScale > 1.2 || width < 360;

  return (
    <Pressable
      testID={`program-card-${program.id}`}
      onPress={() => router.push(`/workouts/programs/${program.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${program.title}. ${goalLabel(program.goal)}. ${days} ${days === 1 ? 'workout' : 'workouts'} a week.${active ? ' Your active program.' : ''}`}
      accessibilityHint="View this program and its workouts"
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}
    >
      <View style={[styles.cover, { backgroundColor: tone.bg }]}>
        <Image
          source={isCardio ? CARDIO_ART : STRENGTH_ART}
          resizeMode="contain"
          accessible={false}
          style={[styles.art, roomyText && styles.artCompact]}
        />
        <View style={[styles.coverCopy, roomyText && styles.coverCopyWide]}>
          <Text style={[styles.goal, { color: tone.fg }]}>{goalLabel(program.goal)}</Text>
          <View style={styles.rhythm}>
            <Text style={[styles.frequency, { color: tone.fg }]}>{days}×</Text>
            <Text style={[styles.frequencyLabel, { color: tone.fg }]}>{days === 1 ? 'workout' : 'workouts'}{'\n'}a week</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {active ? (
          <View style={styles.active}>
            <Check size={14} color={c.accent} strokeWidth={2.5} />
            <Text style={[styles.activeLabel, { color: c.accent }]}>YOUR ACTIVE PROGRAM</Text>
          </View>
        ) : null}
        <Text style={[styles.title, { color: c.text }]}>{program.title}</Text>
        {program.description ? (
          <Text style={[styles.desc, { color: c.mutedText }]} numberOfLines={2}>{program.description}</Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.action, { color: c.text }]}>View program</Text>
          <View style={[styles.arrow, { backgroundColor: tone.bg }]}>
            <ArrowUpRight size={22} color={tone.fg} strokeWidth={1.8} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  pressed: { opacity: 0.82 },
  cover: { minHeight: 180, overflow: 'hidden', padding: spacing.lg },
  art: { position: 'absolute', width: '60%', height: 180, right: -4, top: 8 },
  artCompact: { width: '43%', height: 130, right: -4, top: undefined, bottom: 0 },
  coverCopy: { width: '47%', gap: spacing.lg, flex: 1, justifyContent: 'space-between' },
  coverCopyWide: { width: '62%' },
  goal: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 19 },
  rhythm: { alignItems: 'flex-start', gap: 2 },
  frequency: { fontFamily: type.weight.extrabold, fontSize: 42, lineHeight: 48, letterSpacing: -1.5 },
  frequencyLabel: { fontFamily: type.weight.medium, fontSize: 12, lineHeight: 17 },
  body: { padding: spacing.lg, gap: spacing.sm },
  active: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.xs },
  activeLabel: { flexShrink: 1, fontFamily: type.weight.bold, fontSize: 10, lineHeight: 15, letterSpacing: 1.2 },
  title: { fontFamily: type.weight.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.45 },
  desc: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base, paddingTop: spacing.sm },
  action: { flexShrink: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
