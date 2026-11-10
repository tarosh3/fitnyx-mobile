import { useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { Screen } from '@/src/components/ui/Screen';
import { refreshEntitlement } from '@/src/features/pro/store';
import { useReferrals } from '@/src/features/referrals/data';
import { EnterCodeCard } from '@/src/features/referrals/EnterCodeCard';
import { FriendsList, ReferredByCard } from '@/src/features/referrals/FriendsList';
import { referralErrorMessage } from '@/src/features/referrals/model';
import { HowItWorks } from '@/src/features/referrals/HowItWorks';
import { ShareCodeCard } from '@/src/features/referrals/ShareCodeCard';
import { SparksCard } from '@/src/features/referrals/SparksCard';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { redeemSparks } from '@/src/lib/api/referrals';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Refer friends: your code, Sparks, a friend's code (first 14 days), referred friends. */
export function ReferralsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { data, loading, failed, refresh } = useReferrals();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = async () => {
    setConfirm(false);
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const r = await redeemSparks();
      await Promise.all([refreshEntitlement(), refresh()]);
      const until = new Date(r.pro_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      setNotice({ ok: true, text: `${r.days} days of Pro added. Pro until ${until}.` });
    } catch (e) {
      setNotice({ ok: false, text: referralErrorMessage(e) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}
            style={({ pressed }) => [styles.back, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
            <ChevronLeft size={22} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]}>Refer friends</Text>
        </View>

        <Text style={[styles.headline, { color: c.text }]}>Bring friends. Earn Pro.</Text>
        <Text style={[styles.lead, { color: c.mutedText }]}>
          Every friend who stays active earns you a Spark. Collect {data?.sparks_per_reward ?? 30} for {data?.reward_days ?? 7} days of Pro.
        </Text>

        {!data ? (
          <View style={styles.state}>
            {loading && !failed ? <ActivityIndicator color={c.accent} /> : (
              <>
                <Text style={[styles.lead, { color: c.mutedText }]}>Couldn't load your referrals. Check your connection.</Text>
                <Button title="Try again" variant="secondary" onPress={refresh} />
              </>
            )}
          </View>
        ) : (
          <View style={styles.cards}>
            {data.referred_by ? <ReferredByCard by={data.referred_by} needed={data.active_days_needed} />
              : data.enter_code_until ? <EnterCodeCard until={data.enter_code_until} onApplied={() => { refresh(); }} />
              : null}
            <ShareCodeCard code={data.code} needed={data.active_days_needed} />
            <SparksCard data={data} busy={busy} onRedeem={() => setConfirm(true)} />
            {notice ? (
              <View style={[styles.notice, { backgroundColor: notice.ok ? c.accentSoft : c.card, borderColor: c.border }]}>
                {notice.ok ? <Check size={18} color={c.accent} /> : null}
                <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: notice.ok ? c.accent : c.destructive }]}>{notice.text}</Text>
              </View>
            ) : null}
            <FriendsList friends={data.friends} total={data.friends_total} needed={data.active_days_needed} />
            <HowItWorks needed={data.active_days_needed} cost={data.sparks_per_reward} days={data.reward_days} />
          </View>
        )}
      </Screen>
      <ConfirmModal visible={confirm} variant="primary"
        title={`Get ${data?.reward_days ?? 7} days of Pro?`}
        message={`This spends ${data?.sparks_per_reward ?? 30} Sparks. The days are added to any Pro you already have.`}
        confirmLabel="Get Pro" onConfirm={redeem} onCancel={() => setConfirm(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: spacing['3xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  back: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: type.weight.bold, fontSize: 17 },
  pressed: { opacity: 0.65 },
  headline: { fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 34 },
  lead: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  state: { marginTop: spacing['2xl'], gap: spacing.md, alignItems: 'stretch' },
  cards: { marginTop: spacing.xl, gap: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  noticeText: { flex: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
});
