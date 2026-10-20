import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatGoal, GOAL_KINDS, GOAL_META, type GoalKind } from '@/src/features/goals/model';
import { GOAL_ICONS } from '@/src/features/goals/ui/GoalRings';
import { GoalStepper } from '@/src/features/goals/ui/GoalStepper';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Goals, GoalsUpdate } from '@/src/lib/api/goals';
import { haptic } from '@/src/lib/haptics';
import { spacing, type } from '@/src/styles/tokens';

const HINTS: Record<GoalKind, string> = {
  distance: 'Runs, walks and rides',
  burn: 'Roams and workouts',
  steps: 'During runs and walks',
};

interface Props {
  visible: boolean;
  goals: Goals | null;
  onSave: (update: GoalsUpdate) => Promise<unknown>;
  onClose: () => void;
}

/** Switch daily activity goals on or off and set them. */
export function ActivityGoalsSheet({ visible, goals, onSave, onClose }: Props) {
  const c = useThemeColors();
  const [draft, setDraft] = useState<Record<GoalKind, number | null>>({ distance: null, burn: null, steps: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft({ distance: goals?.daily_distance_m ?? null, burn: goals?.daily_burn_kcal ?? null, steps: goals?.daily_steps ?? null });
    setError(null);
  }, [visible, goals]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(Object.fromEntries(GOAL_KINDS.map((k) => [GOAL_META[k].field, draft[k]])) as GoalsUpdate);
      haptic.success();
      onClose();
    } catch (e) {
      // Toasts render under the sheet, so the error shows here.
      setError((e as Error)?.message || 'Couldn’t save your goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title="Daily goals" subtitle="Every day starts from zero" onClose={onClose}
      footer={<Button testID="goals-save" title="Save goals" onPress={save} loading={saving} />}>
      <View style={styles.list}>
        {GOAL_KINDS.map((kind) => {
          const meta = GOAL_META[kind];
          const Icon = GOAL_ICONS[kind];
          return (
            <GoalStepper key={kind} label={meta.label} hint={HINTS[kind]} icon={<Icon size={22} color={c.goals[kind]} />}
              color={c.goals[kind]} value={draft[kind]} onChange={(v) => setDraft((d) => ({ ...d, [kind]: v }))}
              step={meta.step} min={meta.min} max={meta.max} presets={meta.presets} initial={meta.initial}
              format={(v) => formatGoal(kind, v)} formatPreset={(v) => formatGoal(kind, v, kind === 'distance')} />
          );
        })}
        {error ? <Text style={[styles.error, { color: c.destructive }]} accessibilityLiveRegion="assertive">{error}</Text> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.sm },
  error: { fontFamily: type.weight.semibold, fontSize: 14, textAlign: 'center' },
});
