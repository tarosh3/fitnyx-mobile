import { ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { takenLabel, targetLine } from '@/src/features/workouts/today/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getTodayAlternatives, type TodayItem } from '@/src/lib/api/todayWorkout';
import { radii, spacing, type } from '@/src/styles/tokens';
import type { Exercise } from '@/src/types/exercise';

interface Props {
  /** The exercise whose machine is taken; null = closed. */
  exercise: Exercise | null;
  /** Already in the workout, so not offered. */
  exclude: string[];
  onPick: (item: TodayItem) => void;
  onBrowse: () => void;
  onClose: () => void;
}

/** "Machine taken?": the same muscles on something else, with targets from the user's own numbers. */
export function AlternativesSheet({ exercise, exclude, onPick, onBrowse, onClose }: Props) {
  const c = useThemeColors();
  const [items, setItems] = useState<TodayItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const uuid = exercise?.uuid;

  useEffect(() => {
    if (!uuid) return;
    let alive = true;
    setItems(null);
    setFailed(false);
    getTodayAlternatives(uuid, exclude)
      .then((list) => { if (alive) setItems(list); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
    // `exclude` only matters when the sheet opens.
  }, [uuid]);

  return (
    <Sheet visible={!!exercise} title={takenLabel(exercise)} subtitle={exercise ? `Instead of ${exercise.title}` : undefined} onClose={onClose} testID="alternatives-sheet"
      footer={<Button testID="alternatives-browse" variant="secondary" title="Browse all exercises" onPress={onBrowse} />}>
      {failed ? (
        <Text style={[styles.message, { color: c.mutedText }]}>Couldn’t load suggestions. Check your connection, or browse the exercises saved on this phone.</Text>
      ) : !items ? (
        <View style={styles.loading}><ActivityIndicator color={c.accent} accessibilityLabel="Finding alternatives" /></View>
      ) : !items.length ? (
        <Text style={[styles.message, { color: c.mutedText }]}>No close match for this one. Browse all exercises to pick your own.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((it) => {
            const kit = it.exercise.equipment?.[0]?.name;
            return (
              <Pressable key={it.exercise_uuid} testID={`alternative-${it.exercise_uuid}`} onPress={() => onPick(it)} accessibilityRole="button"
                accessibilityLabel={`${it.exercise.title}. ${targetLine(it)}`}
                style={({ pressed }) => [styles.row, { borderColor: c.border }, pressed && { backgroundColor: c.surface }]}>
                <ExerciseThumb exercise={it.exercise} size={52} />
                <View style={styles.grow}>
                  <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{it.exercise.title}</Text>
                  <Text style={[styles.target, { color: c.text }]}>{targetLine(it)}</Text>
                  <Text style={[styles.kit, { color: c.mutedText }]} numberOfLines={1}>{kit ?? 'No equipment'}{it.kind !== 'first' ? ' · you’ve done this' : ''}</Text>
                </View>
                <ChevronRight size={20} color={c.mutedText} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing['2xl'], alignItems: 'center' },
  message: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22, paddingVertical: spacing.base },
  list: { borderRadius: radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 16 },
  target: { fontFamily: type.weight.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  kit: { fontFamily: type.weight.regular, fontSize: 13 },
});
