import { ArrowUpRight, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sparksProgress } from '@/src/features/referrals/model';
import { ProIcon } from '@/src/features/pro/ProIcon';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ReferralOverview } from '@/src/lib/api/referrals';
import { useReturnOrPush } from '@/src/lib/returnOrPush';
import { radii, spacing, type } from '@/src/styles/tokens';

type Props = { data: Pick<ReferralOverview, 'sparks' | 'sparks_per_reward' | 'reward_days'>; busy: boolean; onRedeem: () => void };
export function SparksCard({ data, busy, onRedeem }: Props) {
  const c = useThemeColors();
  const open = useReturnOrPush();
  const p = sparksProgress(data);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="sparks-card">
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: c.mutedText }]}>YOUR SPARK BALANCE</Text>
        <Sparkles size={19} color={c.accent} />
      </View>
      <View style={styles.balance}>
        <Text style={[styles.count, { color: c.text }]} testID="sparks-count" accessibilityLabel={`${data.sparks} of ${data.sparks_per_reward} Sparks`}>{data.sparks}<Text style={[styles.of, { color: c.mutedText }]}> / {data.sparks_per_reward}</Text></Text>
        <View style={[styles.reward, { backgroundColor: c.accentSoft }]}>
          <ProIcon size={24} color={c.accent} />
          <View><Text style={[styles.rewardTitle, { color: c.text }]}>{data.reward_days} days</Text><Text style={[styles.small, { color: c.accent }]}>of FitNyx Pro</Text></View>
        </View>
      </View>
      <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel="Progress to Pro reward"
        accessibilityValue={{ min: 0, max: data.sparks_per_reward, now: p.toward }}>
        {Array.from({ length: 15 }, (_, i) => <View key={i} style={[styles.segment, { backgroundColor: c.border }]}>
          <View style={{ height: '100%', width: `${Math.max(0, Math.min(1, p.fraction * 15 - i)) * 100}%`, backgroundColor: c.primary }} />
        </View>)}
      </View>
      <Text style={[styles.left, { color: c.mutedText }]}>{p.canRedeem ? 'Your next stretch of Pro is ready.' : `${p.left === 1 ? '1 more Spark' : `${p.left} more Sparks`} to unlock ${data.reward_days} days of Pro`}</Text>
      {p.canRedeem ? <Button testID="sparks-redeem" title={`Get ${data.reward_days} days of Pro`} loading={busy} onPress={onRedeem} /> : null}
      <View style={[styles.foot, { borderColor: c.border }]}>
        <Text style={[styles.small, { color: c.mutedText }]}>Sparks don't expire.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Explore Pro" onPress={() => open('pro', '/pro')}
          style={({ pressed }) => [styles.explore, pressed && { opacity: 0.7 }]}><Text style={[styles.small, { color: c.accent }]}>Explore Pro</Text><ArrowUpRight size={15} color={c.accent} /></Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], borderWidth: 1, padding: spacing.lg, gap: spacing.base },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, lineHeight: 16, letterSpacing: 1.5 },
  balance: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  count: { fontFamily: type.weight.extrabold, fontSize: 48, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  of: { fontFamily: type.weight.medium, fontSize: 20, letterSpacing: -0.5 },
  reward: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'center', borderRadius: radii.lg },
  rewardTitle: { fontFamily: type.weight.bold, fontSize: 18 },
  small: { fontFamily: type.weight.medium, fontSize: 11, lineHeight: 17 },
  track: { flexDirection: 'row', gap: 4, height: 20 },
  segment: { flex: 1, borderRadius: 3, overflow: 'hidden' },
  left: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 20 },
  foot: { flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  explore: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
