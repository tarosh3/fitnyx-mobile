import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { plural } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { StarterProgram } from '@/src/lib/api/plan';
import { radii, spacing, type } from '@/src/styles/tokens';
import { exerciseTarget } from './model';

/** The starter program, day by day; the first day starts open. */
export function ProgramPreview({ program }: { program: StarterProgram }) {
  const c = useThemeColors();
  const [open, setOpen] = useState(0);
  const days = program.days ?? [];
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: c.text }]}>{program.title}</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>{program.description}</Text>
      {days.map((d, i) => {
        const exercises = d.exercises ?? [];
        const expanded = open === i;
        return (
          <View key={`${d.title}-${i}`} style={[styles.day, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable
              onPress={() => setOpen(expanded ? -1 : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`Day ${i + 1}: ${d.title}, ${plural(exercises.length, 'exercise')}`}
              style={styles.dayHead}
            >
              <View style={[styles.dayNum, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.dayNumText, { color: c.accent }]}>{i + 1}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.dayTitle, { color: c.text }]}>{d.title}</Text>
                <Text style={[styles.meta, { color: c.mutedText }]}>{plural(exercises.length, 'exercise')} · ~{d.estimated_duration_min} min</Text>
              </View>
              {expanded ? <ChevronUp size={22} color={c.mutedText} /> : <ChevronDown size={22} color={c.mutedText} />}
            </Pressable>
            {expanded ? (
              <>
                {exercises.map((e) => (
                  <View key={e.exercise_uuid} style={[styles.ex, { borderColor: c.border }]}>
                    <Text style={[styles.exName, { color: c.text }]} numberOfLines={2}>{e.title}</Text>
                    <Text style={[styles.exTarget, { color: c.mutedText }]}>{exerciseTarget(e)}</Text>
                  </View>
                ))}
                {d.notes ? <Text style={[styles.meta, { color: c.mutedText }]}>{d.notes}</Text> : null}
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: type.weight.extrabold, fontSize: 21 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  day: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  dayNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontFamily: type.weight.extrabold, fontSize: 16 },
  dayTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  meta: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 18 },
  ex: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  exName: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  exTarget: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
});
