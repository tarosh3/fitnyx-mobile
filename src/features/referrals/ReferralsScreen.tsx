import { Check, WifiOff } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/src/components/ui/Skeleton';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { MembershipLayout } from '@/src/features/pro/MembershipLayout';
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
    <MembershipLayout title="Refer friends">
        {!data ? (
          <View style={styles.state}>
            {loading && !failed ? <View accessibilityLabel="Loading your invitation and rewards" accessibilityState={{ busy: true }} style={{ gap: spacing.lg }}>
              <Skeleton height={280} radius={radii['2xl']} /><Skeleton height={100} radius={radii.xl} />
              <Text accessibilityLiveRegion="polite" style={[styles.lead, { color: c.mutedText }]}>Getting your invitation ready…</Text>
            </View> : (
              <>
                <WifiOff size={32} color={c.mutedText} />
                <Text style={[styles.lead, { color: c.mutedText }]}>Couldn't load your referrals. Check your connection.</Text>
                <Button title="Try again" variant="secondary" onPress={refresh} />
              </>
            )}
          </View>
        ) : (
          <View style={styles.cards}>
            <ShareCodeCard code={data.code} needed={data.active_days_needed} />
            <SparksCard data={data} busy={busy} onRedeem={() => setConfirm(true)} />
            {notice ? (
              <View style={[styles.notice, { backgroundColor: notice.ok ? c.accentSoft : c.card, borderColor: c.border }]}>
                {notice.ok ? <Check size={18} color={c.accent} /> : null}
                <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: notice.ok ? c.accent : c.destructive }]}>{notice.text}</Text>
              </View>
            ) : null}
            <HowItWorks needed={data.active_days_needed} cost={data.sparks_per_reward} days={data.reward_days} />
            <FriendsList friends={data.friends} total={data.friends_total} needed={data.active_days_needed} />
            {data.referred_by ? <ReferredByCard by={data.referred_by} needed={data.active_days_needed} />
              : data.enter_code_until ? <EnterCodeCard until={data.enter_code_until} onApplied={() => { refresh(); }} />
              : null}
          </View>
        )}
      <ConfirmModal visible={confirm} variant="primary"
        title={`Get ${data?.reward_days ?? 7} days of Pro?`}
        message={`This spends ${data?.sparks_per_reward ?? 30} Sparks. The days are added to any Pro you already have.`}
        confirmLabel="Get Pro" onConfirm={redeem} onCancel={() => setConfirm(false)} />
    </MembershipLayout>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21 },
  state: { paddingVertical: spacing.xl, minHeight: 240, justifyContent: 'center', gap: spacing.lg },
  cards: { gap: spacing.xl },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  noticeText: { flex: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
});
