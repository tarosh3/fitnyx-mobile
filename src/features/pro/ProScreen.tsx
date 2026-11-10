import { useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, Gift, Ticket } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MembershipLayout } from '@/src/features/pro/MembershipLayout';
import { planLine } from '@/src/features/pro/model';
import { ProFeatures } from '@/src/features/pro/ProFeatures';
import { ProHero } from '@/src/features/pro/ProHero';
import { RedeemCodeCard } from '@/src/features/pro/RedeemCodeCard';
import { useEntitlement } from '@/src/features/pro/store';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useReturnOrPush } from '@/src/lib/returnOrPush';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Membership story, Pro-code redemption and the way to Refer friends. Store subscriptions are not available yet. */
export function ProScreen() {
  const c = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const open = useReturnOrPush();
  const { redeem } = useLocalSearchParams<{ redeem?: string }>();
  const { isPro, entitlement, loaded } = useEntitlement();
  const [done, setDone] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const codeRef = useRef<TextInput>(null);
  const redeemY = useRef<number | null>(null);
  const jumped = useRef(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToCode = useCallback(() => {
    if (redeemY.current === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, redeemY.current - spacing.base), animated: true });
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => codeRef.current?.focus(), 350);
  }, []);

  useEffect(() => {
    if (redeem === '1' && redeemY.current !== null && !jumped.current) {
      jumped.current = true;
      goToCode();
    }
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [redeem, goToCode]);

  return (
    <MembershipLayout title="FitNyx Pro" scrollRef={scrollRef} right={
      <Pressable accessibilityRole="button" accessibilityLabel="Enter a Pro code" onPress={goToCode}
        style={({ pressed }) => [styles.inviteLink, { backgroundColor: c.accentSoft }, pressed && styles.pressed]}>
        <Ticket size={16} color={c.accent} />
        {width / fontScale >= 300 ? <Text style={[styles.linkText, { color: c.accent }]}>Pro code</Text> : null}
      </Pressable>
    }>
        <ProHero pro={isPro} />

        <View style={styles.access}>
          {!loaded ? <Text style={[styles.note, { color: c.mutedText }]} accessibilityLiveRegion="polite">Checking your membership…</Text> : isPro ? (
            <View style={[styles.membership, { backgroundColor: c.accentSoft, borderColor: c.border }]}>
              <View style={[styles.check, { backgroundColor: c.primary }]}><Check size={18} color={c.primaryText} /></View>
              <View style={styles.memberCopy}>
                <Text style={[styles.memberTitle, { color: c.text }]}>You're on Pro</Text>
                <Text style={[styles.memberDetail, { color: c.mutedText }]}>{planLine(entitlement)}</Text>
              </View>
              <Text style={[styles.active, { color: c.accent }]}>ACTIVE</Text>
            </View>
          ) : (
            <>
              <Button testID="pro-unlock" title="Unlock Pro with a code" onPress={goToCode} iconAfter={<ArrowRight size={19} color={c.primaryText} />} />
              <Text style={[styles.note, { color: c.mutedText }]}>Available with a Pro code, or earn it by referring friends. Subscriptions launch with the app's store release.</Text>
            </>
          )}
        </View>

        <ProFeatures pro={isPro} />

        {/* Direct ScrollView child: layout.y is the actual scroll offset, within the scroll content. */}
        <View style={styles.redeem} onLayout={(e) => {
          redeemY.current = e.nativeEvent.layout.y;
          if (redeem === '1' && !jumped.current) {
            jumped.current = true;
            goToCode();
          }
        }}>
          <Text style={[styles.sectionEyebrow, { color: c.accent }]}>{isPro ? 'KEEP THE GOOD THING GOING' : 'YOUR WAY INTO PRO'}</Text>
          <RedeemCodeCard ref={codeRef} pro={isPro}
            onRedeemed={(days) => setDone(days ? `Code redeemed: ${days} days of Pro added.` : 'Code redeemed: Pro is on.')}
            onReferralCode={() => open('referrals', '/referrals')} />
          {done ? <View style={[styles.success, { backgroundColor: c.accentSoft }]}>
            <Check size={20} color={c.accent} />
            <Text style={[styles.done, { color: c.accent }]} accessibilityLiveRegion="polite">{done}</Text>
          </View> : null}
        </View>
        <Pressable testID="pro-refer" accessibilityRole="button" onPress={() => open('referrals', '/referrals')}
          style={({ pressed }) => [styles.refer, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
          <View style={[styles.referIcon, { backgroundColor: c.accentSoft }]}><Gift size={20} color={c.accent} /></View>
          <View style={styles.memberCopy}>
            <Text style={[styles.memberTitle, { color: c.text }]}>Or earn Pro free</Text>
            <Text style={[styles.memberDetail, { color: c.mutedText }]}>Turn your invitations into Sparks, then redeem them for Pro.</Text>
          </View>
          <ArrowRight size={18} color={c.mutedText} />
        </Pressable>
        <Text style={[styles.footer, { color: c.mutedText }]}>A little more support. A lot more you.</Text>
    </MembershipLayout>
  );
}

const styles = StyleSheet.create({
  inviteLink: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkText: { fontFamily: type.weight.semibold, fontSize: 12 },
  pressed: { opacity: 0.65 },
  access: { marginTop: spacing.base, marginBottom: spacing['2xl'], gap: spacing.sm },
  note: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.md },
  membership: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  check: { width: 32, height: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  memberCopy: { flex: 1, minWidth: 130, gap: spacing.xs },
  memberTitle: { fontFamily: type.weight.bold, fontSize: 15 },
  memberDetail: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
  active: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1 },
  sectionEyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.5, lineHeight: 16 },
  redeem: { marginTop: spacing['2xl'], gap: spacing.md },
  success: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: radii.md },
  done: { flex: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
  refer: { marginTop: spacing.xl, borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  referIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  footer: { fontFamily: type.weight.medium, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
});
