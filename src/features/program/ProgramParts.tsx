import { CheckCircle2, Circle, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatChange, phaseDetail, phaseLabel } from '@/src/features/program/model';
import { WeekStrip } from '@/src/features/program/WeekStrip';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Program, ProgramChange } from '@/src/lib/api/programs';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Where you are: week n of N, the strip, and what this week asks for. */
export function BlockHeader({ program }: { program: Program }) {
  const c = useThemeColors();
  return (
    <View style={styles.gap}>
      <Text style={[styles.eyebrow, { color: c.accent }]}>
        {program.finished ? 'BLOCK COMPLETE' : `WEEK ${program.week} OF ${program.weeks}`}
      </Text>
      <Text style={[styles.title, { color: c.text }]}>{program.title}</Text>
      <WeekStrip weeks={program.weeks} week={program.week} finished={program.finished} />
      {program.finished ? null : (
        <View style={[styles.phase, { backgroundColor: c.surface }]}>
          <Text style={[styles.phaseTitle, { color: c.text }]}>{phaseLabel(program.phase)}</Text>
          <Text style={[styles.body, { color: c.mutedText }]}>{phaseDetail(program.phase)}</Text>
        </View>
      )}
    </View>
  );
}

/** This week's workouts, ticked when done. */
export function WeekDays({ program }: { program: Program }) {
  const c = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.mutedText }]}>
        THIS WEEK · {Math.min(program.done, program.planned)} OF {program.planned} DONE
      </Text>
      {program.days.map((d) => (
        <View key={d.id} style={styles.day}>
          {d.done_this_week ? <CheckCircle2 size={20} color={c.accent} /> : <Circle size={20} color={c.border} />}
          <Text style={[styles.dayName, { color: c.text }]}>{d.title}</Text>
          <Text style={[styles.body, { color: c.mutedText }]}>{d.exercises} exercises</Text>
        </View>
      ))}
      <Text style={[styles.hint, { color: c.mutedText }]}>Miss two or more and the week repeats, so nothing gets skipped.</Text>
    </View>
  );
}

/** What the finished block built. */
export function Gains({ gains }: { gains: ProgramChange[] }) {
  const c = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.primary }]} testID="program-gains">
      <Text style={[styles.label, { color: c.accent }]}>WHAT THIS BLOCK BUILT</Text>
      {gains.length === 0 ? (
        <Text style={[styles.body, { color: c.mutedText }]}>Log a few more weeks of the same lifts to see your gains here.</Text>
      ) : gains.map((g) => (
        <View key={g.exercise_uuid} style={styles.day}>
          <TrendingUp size={18} color={c.accent} />
          <Text style={[styles.dayName, { color: c.text }]} numberOfLines={1}>{g.title}</Text>
          <Text style={[styles.gain, { color: c.text }]}>{formatChange(g)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: type.weight.extrabold, fontSize: 24, letterSpacing: -0.5 },
  phase: { borderRadius: radii.lg, padding: spacing.md, gap: 4, marginTop: spacing.xs },
  phaseTitle: { fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  label: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1 },
  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  dayName: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  gain: { fontFamily: type.weight.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: type.weight.regular, fontSize: 12 },
});
