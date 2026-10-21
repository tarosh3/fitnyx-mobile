import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';
import { GRIT, gritLines, gritNote } from '../grit';

/** The workout's Grit and how it was earned. Nothing until the backend has scored it (e.g. a finish still queued offline). */
export function GritCard({ session }: { session: Pick<WorkoutSession, 'grit' | 'grit_breakdown'> | null | undefined }) {
  const c = useThemeColors();
  const b = session?.grit_breakdown;
  if (session?.grit == null || !b) return null;
  const lines = gritLines(b);
  const note = gritNote(b);
  return (
    <View testID="grit-card" style={[styles.card, { backgroundColor: c.accentSoft }]}
      accessible accessibilityLabel={`${session.grit} Grit earned${note ? `. ${note}` : ''}`}>
      <View style={styles.head}>
        <Sparkles size={22} color={c.accent} />
        <Text style={[styles.total, { color: c.text }]}>+{session.grit.toLocaleString('en-US')}</Text>
        <Text style={[styles.unit, { color: c.accent }]}>Grit</Text>
      </View>
      {lines.map((l) => (
        <View key={l.label} style={styles.line}>
          <Text style={[styles.label, { color: c.text }]}>{l.label}</Text>
          <Text style={[styles.points, { color: c.mutedText }]}>+{l.points}</Text>
        </View>
      ))}
      {note ? <Text style={[styles.note, { color: c.mutedText }]}>{note}</Text> : null}
      <Text style={[styles.note, { color: c.mutedText }]}>
        Grit rewards effort, not weight: +{GRIT.set} a set, +{GRIT.record} for beating your own best.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.base, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  total: { fontFamily: type.weight.extrabold, fontSize: 32, fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  unit: { fontFamily: type.weight.bold, fontSize: 17 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { fontFamily: type.weight.regular, fontSize: 15, flexShrink: 1 },
  points: { fontFamily: type.weight.semibold, fontSize: 15, fontVariant: ['tabular-nums'] },
  note: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
});
