import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sparksProgress } from '@/src/features/referrals/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ReferralOverview } from '@/src/lib/api/referrals';
import { radii, spacing, type } from '@/src/styles/tokens';

type Props = {
  data: Pick<ReferralOverview, 'sparks' | 'sparks_per_reward' | 'reward_days'>;
  busy: boolean;
  onRedeem: () => void;
};

/** Sparks balance, progress to the next reward, and Redeem. */
export function SparksCard({ data, busy, onRedeem }: Props) {
  const c = useThemeColors();
  const p = sparksProgress(data);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="sparks-card">
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><Sparkles size={20} color={c.accent} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: c.text }]}>Sparks</Text>
          <Text style={[styles.sub, { color: c.mutedText }]}>{data.sparks_per_reward} Sparks = {data.reward_days} days of Pro</Text>
        </View>
        <Text style={[styles.count, { color: c.text }]} testID="sparks-count"
          accessibilityLabel={`${data.sparks} of ${data.sparks_per_reward} Sparks`}>
          {data.sparks}<Text style={[styles.of, { color: c.mutedText }]}> / {data.sparks_per_reward}</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { backgroundColor: c.primary, width: `${Math.round(p.fraction * 100)}%` }]} />
      </View>
      {p.canRedeem ? (
        <Button testID="sparks-redeem" title={`Get ${data.reward_days} days of Pro`} loading={busy} onPress={onRedeem} />
      ) : (
        <Text style={[styles.left, { color: c.mutedText }]}>
          {p.left === 1 ? '1 more Spark' : `${p.left} more Sparks`} to unlock {data.reward_days} days of Pro
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  sub: { fontFamily: type.weight.regular, fontSize: 12 },
  count: { fontFamily: type.weight.extrabold, fontSize: 26, fontVariant: ['tabular-nums'] },
  of: { fontFamily: type.weight.semibold, fontSize: 15 },
  track: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radii.pill },
  left: { fontFamily: type.weight.medium, fontSize: 13, textAlign: 'center' },
});
