import { ArrowUpRight, Repeat, Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatChange } from '@/src/features/program/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgramCheckin } from '@/src/lib/api/programs';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Last week's review: Filo's note, what went up, and what was swapped. */
export function CheckinCard({ checkin, fresh }: { checkin: ProgramCheckin; fresh?: boolean }) {
  const c = useThemeColors();
  const title = checkin.finished
    ? 'Block complete'
    : checkin.advanced ? `Week ${checkin.week} review` : `Week ${checkin.week} again`;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: fresh ? c.primary : c.border }]} testID="program-checkin">
      <View style={styles.head}>
        <Sparkles size={16} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>{fresh ? 'NEW · ' : ''}{title.toUpperCase()}</Text>
      </View>
      <Text style={[styles.note, { color: c.text }]}>{checkin.note}</Text>
      <Text style={[styles.meta, { color: c.mutedText }]}>{checkin.done} of {checkin.planned} workouts done</Text>
      {checkin.up.slice(0, 3).map((u) => (
        <View key={u.exercise_uuid} style={styles.line}>
          <ArrowUpRight size={16} color={c.accent} />
          <Text style={[styles.lineText, { color: c.text }]} numberOfLines={1}>
            {u.title}{formatChange(u) ? <Text style={{ color: c.mutedText }}>{`  ${formatChange(u)}`}</Text> : null}
          </Text>
        </View>
      ))}
      {checkin.swaps.map((s) => (
        <View key={s.from_uuid} style={styles.line}>
          <Repeat size={16} color={c.mutedText} />
          <Text style={[styles.lineText, { color: c.text }]}>
            {s.from_title} stalled for three weeks, so it's now <Text style={{ fontFamily: type.weight.semibold }}>{s.to_title}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1 },
  note: { fontFamily: type.weight.medium, fontSize: 16, lineHeight: 23 },
  meta: { fontFamily: type.weight.regular, fontSize: 13 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineText: { flex: 1, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
});
