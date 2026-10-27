import { Sparkles, Target } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { LoopingLottie } from '@/src/components/ui/LoopingLottie';
import { DietWizard } from '@/src/features/diet/DietWizard';
import { usePlan } from '@/src/features/plan/data';
import { dietWizardDefaults, thousands } from '@/src/features/plan/model';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { generateDietPlan, type DietPlan } from '@/src/lib/api';
import { radii, spacing, type } from '@/src/styles/tokens';

const TIPS = [
  'Muscle burns more calories at rest than fat.',
  'Protein after workouts supports recovery and growth.',
  'Sleep quality strongly affects muscle repair.',
  'Hydration can directly improve workout performance.',
  'Consistency over intensity wins long-term progress.',
];

/** The preferences wizard, then Filo builds the plan (takes up to a minute). */
export function DietSetup({ userId, onCreated, onStepChange }: { userId: string; onCreated: (plan: DietPlan) => void; onStepChange?: () => void }) {
  const c = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const plan = usePlan().data;

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(t);
  }, [generating]);

  const generate = async (preferences: Record<string, unknown>) => {
    if (!isOnline) {
      setError("You're offline. Connect to the internet to create your plan.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      onCreated(await generateDietPlan(userId, preferences));
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status === 429 ? 'Filo is busy — try again in a minute.' : "Couldn't create your plan. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLiveRegion="polite">
        <View style={[styles.orb, { backgroundColor: c.accentSoft }]}>
          <LoopingLottie source={require('@/assets/animations/chatbot.json')} style={styles.lottie} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Filo is building your plan</Text>
        <View style={styles.tipRow}>
          <Sparkles color={c.accent} size={14} />
          <Text style={[styles.tip, { color: c.mutedText }]}>{TIPS[tip]}</Text>
        </View>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View>
      {error ? <Text style={[styles.error, { color: c.destructive }]} accessibilityRole="alert">{error}</Text> : null}
      {plan?.targets ? (
        <View testID="diet-plan-target" style={[styles.target, { backgroundColor: c.accentSoft }]}>
          <Target color={c.accent} size={16} />
          <Text style={[styles.targetText, { color: c.text }]}>
            Your plan: about {thousands(plan.targets.calories)} kcal and {plan.targets.protein_g} g protein a day. Filo sizes the meals to match.
          </Text>
        </View>
      ) : null}
      <DietWizard onComplete={generate} isLoading={generating} offline={!isOnline} onStepChange={onStepChange} initial={dietWizardDefaults(plan)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xl, borderRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth, padding: spacing['2xl'], alignItems: 'center' },
  orb: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  lottie: { width: 80, height: 80 },
  title: { fontFamily: type.weight.extrabold, fontSize: 20, marginBottom: spacing.md, textAlign: 'center' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  tip: { fontFamily: type.weight.medium, fontSize: 14, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
  error: { fontFamily: type.weight.semibold, fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  target: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  targetText: { flex: 1, fontFamily: type.weight.medium, fontSize: 14, lineHeight: 20 },
});
