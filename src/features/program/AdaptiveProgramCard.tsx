import { useRouter } from 'expo-router';
import { ArrowRight, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFeatureFlag } from '@/src/features/appConfig/store';
import { BuildProgramSheet } from '@/src/features/program/BuildProgramSheet';
import { useActiveProgram, useCheckinSeen } from '@/src/features/program/data';
import { useProGate } from '@/src/features/pro/gate';
import { ProTag } from '@/src/features/pro/ProTag';
import { phaseLabel } from '@/src/features/program/model';
import { WeekStrip } from '@/src/features/program/WeekStrip';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/**
 * The adaptive program on Train and Home: where you are in the block, or (pitch)
 * an offer to build one. `pitch` false shows nothing without a program.
 */
export function AdaptiveProgramCard({ pitch = true }: { pitch?: boolean }) {
  const c = useThemeColors();
  const router = useRouter();
  const enabled = useFeatureFlag('adaptive_program', true);
  const { data: program, loading } = useActiveProgram();
  const { seen } = useCheckinSeen(program?.id);
  const [building, setBuilding] = useState(false);
  const gate = useProGate();
  if (!enabled || loading) return null;

  if (!program) {
    if (!pitch) return null;
    return (
      <View testID="program-pitch" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <TrendingUp size={16} color={c.accent} />
          <Text style={[styles.eyebrow, { color: c.accent }]}>ADAPTIVE PROGRAM</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>A program that adapts to you</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>
          4 to 12 weeks. Every workout's targets come from what you did last time, lighter weeks are built in, and Filo checks in each week.
        </Text>
        {gate.locked ? <ProTag /> : null}
        <Button testID="program-pitch-build" title={gate.locked ? 'See Pro' : 'Build my program'} onPress={() => gate.run(() => setBuilding(true))} />
        <BuildProgramSheet visible={building} onClose={() => setBuilding(false)}
          onBuilt={() => { setBuilding(false); router.push('/program'); }} />
      </View>
    );
  }

  const fresh = !!program.last_checkin && seen != null && program.last_checkin.calendar_week > seen;
  const eyebrow = program.finished ? 'BLOCK COMPLETE' : `WEEK ${program.week} OF ${program.weeks} · ${phaseLabel(program.phase).toUpperCase()}`;
  return (
    <Pressable testID="program-card" onPress={() => router.push('/program')} accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: fresh ? c.primary : c.border }, pressed && { opacity: 0.85 }]}>
      <View style={styles.row}>
        <TrendingUp size={16} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]} numberOfLines={1}>{eyebrow}</Text>
      </View>
      <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{program.title}</Text>
      <WeekStrip weeks={program.weeks} week={program.week} finished={program.finished} compact />
      <View style={styles.foot}>
        <Text style={[styles.body, { color: c.mutedText, flex: 1 }]}>
          {fresh ? 'Your week in review is ready' : program.finished ? 'See what this block built' : `${Math.min(program.done, program.planned)} of ${program.planned} workouts this week`}
        </Text>
        <Text style={[styles.link, { color: c.accent }]}>Open</Text>
        <ArrowRight size={16} color={c.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1, flexShrink: 1 },
  title: { fontFamily: type.weight.bold, fontSize: 19 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { fontFamily: type.weight.semibold, fontSize: 15 },
});
