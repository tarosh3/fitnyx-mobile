import { Beef, Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoalStepper } from '@/src/features/goals/ui/GoalStepper';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { GOAL_LIMITS, type Goals, type GoalsUpdate } from '@/src/lib/api/goals';
import { haptic } from '@/src/lib/haptics';
import { spacing, type } from '@/src/styles/tokens';
import { fmt, type Macros } from '../model';

interface Props {
  visible: boolean;
  /** The diet plan's own goals (before the user's override). */
  plan: Macros;
  goals: Goals | null;
  onSave: (update: GoalsUpdate) => Promise<unknown>;
  onClose: () => void;
}

const round = (v: number, step: number) => Math.round(v / step) * step;
/** Quick picks around the plan's number, inside the allowed range. */
const around = (base: number, deltas: number[], step: number, [min, max]: [number, number]) =>
  [...new Set(deltas.map((d) => Math.min(max, Math.max(min, round(base + d, step)))))];

/** Your own calorie + protein goals; switched off = the plan's numbers. */
export function DietGoalsSheet({ visible, plan, goals, onSave, onClose }: Props) {
  const c = useThemeColors();
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setKcal(goals?.diet_kcal ?? null);
    setProtein(goals?.diet_protein_g ?? null);
    setError(null);
  }, [visible, goals]);

  const save = async (update: GoalsUpdate) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(update);
      haptic.success();
      onClose();
    } catch (e) {
      setError((e as Error)?.message || 'Couldn’t save your goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const custom = goals?.diet_kcal != null || goals?.diet_protein_g != null;

  return (
    <Sheet visible={visible} title="Nutrition goals" subtitle="Switch one off to use your plan’s number" onClose={onClose}
      footer={<>
        <Button testID="diet-goals-save" title="Save goals" onPress={() => save({ diet_kcal: kcal, diet_protein_g: protein })} loading={saving} />
        {custom ? <Button title="Use my plan’s goals" variant="quiet" onPress={() => save({ diet_kcal: null, diet_protein_g: null })} disabled={saving} /> : null}
      </>}>
      <View style={styles.list}>
        <GoalStepper label="Calories" hint={`Plan: ${fmt(plan.kcal)} kcal a day`} icon={<Flame size={22} color={c.goals.burn} />}
          color={c.goals.burn} value={kcal} onChange={setKcal} step={50} min={GOAL_LIMITS.diet_kcal[0]} max={GOAL_LIMITS.diet_kcal[1]}
          presets={around(plan.kcal, [-250, 0, 250, 500], 50, GOAL_LIMITS.diet_kcal)} initial={round(plan.kcal, 50)}
          format={(v) => `${fmt(v)} kcal`} formatPreset={fmt} />
        <GoalStepper label="Protein" hint={`Plan: ${Math.round(plan.protein)} g a day`} icon={<Beef size={22} color={c.diet.protein} />}
          color={c.diet.protein} value={protein} onChange={setProtein} step={5} min={GOAL_LIMITS.diet_protein_g[0]} max={GOAL_LIMITS.diet_protein_g[1]}
          presets={around(plan.protein, [-20, 0, 20, 40], 5, GOAL_LIMITS.diet_protein_g)} initial={round(plan.protein, 5) || 100}
          format={(v) => `${v} g`} />
        <Text style={[styles.note, { color: c.mutedText }]}>Carbs and fat adjust to fit. Your meal plan stays the same; regenerate it to match new goals.</Text>
        {error ? <Text style={[styles.error, { color: c.destructive }]} accessibilityLiveRegion="assertive">{error}</Text> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.sm },
  note: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  error: { fontFamily: type.weight.semibold, fontSize: 14, textAlign: 'center' },
});
