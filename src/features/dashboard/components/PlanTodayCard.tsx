import { useRouter } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlan } from '@/src/features/plan/data';
import { thousands } from '@/src/features/plan/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

/**
 * Today's targets from the plan (eat · burn · train). Until dismissed it also
 * announces the plan — for users who finished onboarding before plans existed.
 */
export function PlanTodayCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const plan = usePlan().data;
  const [introOpen, setIntroOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    cacheGetStale<boolean>(cacheKeys.planIntroDismissed(user.id))
      .then((dismissed) => setIntroOpen(!dismissed))
      .catch(() => undefined);
  }, [user]);

  if (!plan?.targets) return null;
  const { targets, today, schedule } = plan;
  const dismiss = () => {
    setIntroOpen(false);
    // A year: the dismissal is a per-device convenience, read back stale.
    if (user) cacheSet(cacheKeys.planIntroDismissed(user.id), true, cacheTTL.DAY * 365).catch(() => undefined);
  };
  const train = today.training_day ? `${schedule.session_min} min workout` : 'Rest day';
  const stats = [
    { label: 'Eat', value: `${thousands(targets.calories)} kcal` },
    { label: 'Protein', value: `${targets.protein_g} g` },
    { label: today.training_day ? 'Burn' : 'Train', value: today.training_day ? `~${thousands(targets.burn_per_session_kcal)} kcal` : 'Recover' },
  ];

  return (
    <Pressable
      testID="home-plan-card"
      onPress={() => router.push('/plan')}
      accessibilityRole="button"
      accessibilityLabel={`Your plan today: ${train}. Eat ${targets.calories} calories, ${targets.protein_g} grams of protein.`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: introOpen ? c.primary : c.border }, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>{introOpen ? 'NEW · YOUR PLAN IS READY' : 'YOUR PLAN TODAY'}</Text>
        {introOpen ? (
          <Pressable testID="home-plan-dismiss" onPress={dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
            <X size={18} color={c.mutedText} />
          </Pressable>
        ) : <ArrowRight size={18} color={c.mutedText} />}
      </View>
      <Text style={[styles.title, { color: c.text }]}>{train}</Text>
      {introOpen ? <Text style={[styles.body, { color: c.mutedText }]}>Calories, a weekly schedule and a starter program, built from your answers.</Text> : null}
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: c.surface }]}>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm, marginTop: spacing.md },
  pressed: { opacity: 0.88 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  close: { minWidth: 32, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.xs, letterSpacing: type.tracking.eyebrow },
  title: { fontFamily: type.weight.bold, fontSize: 19 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  stat: { flex: 1, borderRadius: radii.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: 2 },
  statLabel: { fontFamily: type.weight.medium, fontSize: 12 },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 16, fontVariant: ['tabular-nums'] },
});
