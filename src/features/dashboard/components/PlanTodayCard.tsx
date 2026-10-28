import { useRouter } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { usePlan } from '@/src/features/plan/data';
import { thousands } from '@/src/features/plan/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing, type } from '@/src/styles/tokens';

/**
 * Today's targets from the plan (eat · burn · train). Until dismissed it also
 * announces the plan — for users who finished onboarding before plans existed.
 */
export function PlanTodayCard() {
  const c = useThemeColors();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.2 || width < 360;
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
      style={({ pressed }) => [styles.card, { borderColor: c.border }, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>{introOpen ? 'NEW · YOUR PLAN IS READY' : 'YOUR PLAN TODAY'}</Text>
        {introOpen ? (
          <Pressable testID="home-plan-dismiss" onPress={(event) => { event.stopPropagation(); dismiss(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
            <X size={18} color={c.mutedText} />
          </Pressable>
        ) : <ArrowRight size={18} color={c.mutedText} />}
      </View>
      <Text style={[styles.body, { color: c.mutedText }]}>{train}</Text>
      <View style={[styles.stats, stacked && styles.stacked]}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, stacked && styles.statRow]}>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: c.text }]}>{s.value}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.md, paddingTop: spacing.md, paddingHorizontal: spacing.xs, gap: spacing.xs },
  pressed: { opacity: 0.88 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  close: { flexShrink: 0, minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  eyebrow: { flexShrink: 1, fontFamily: type.weight.semibold, fontSize: type.size.micro, letterSpacing: 1.2 },
  body: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  stacked: { flexDirection: 'column' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, gap: 5 },
  statLabel: { fontFamily: type.weight.medium, fontSize: 12 },
  statValue: { fontFamily: type.weight.semibold, fontSize: 16, fontVariant: ['tabular-nums'] },
});
