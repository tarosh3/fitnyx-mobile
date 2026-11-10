import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Check, ChevronLeft, Gift, Ticket } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { planLine } from '@/src/features/pro/model';
import { ProFeatures } from '@/src/features/pro/ProFeatures';
import { ProHero } from '@/src/features/pro/ProHero';
import { RedeemCodeCard } from '@/src/features/pro/RedeemCodeCard';
import { useEntitlement } from '@/src/features/pro/store';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Membership story, Pro-code redemption and the way to Refer friends. Store subscriptions are not available yet. */
export function ProScreen() {
  const c = useThemeColors();
  const router = useRouter();
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
    // "padding" on both: Android's edge-to-edge window no longer resizes for the
    // keyboard, so `undefined` left the redeem button under it (CLAUDE.md, Keyboard).
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <Screen scrollRef={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}
            style={({ pressed }) => [styles.back, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
            <ChevronLeft size={22} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]}>FitNyx Pro</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Enter a Pro code" onPress={goToCode}
            style={({ pressed }) => [styles.inviteLink, pressed && styles.pressed]}>
            <Ticket size={16} color={c.accent} />
            <Text style={[styles.linkText, { color: c.accent }]}>Pro code</Text>
          </Pressable>
        </View>

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

        {/* Direct ScrollView child: layout.y is the actual scroll offset, including the header. */}
        <View style={styles.redeem} onLayout={(e) => {
          redeemY.current = e.nativeEvent.layout.y;
          if (redeem === '1' && !jumped.current) {
            jumped.current = true;
            goToCode();
          }
        }}>
          <RedeemCodeCard ref={codeRef} pro={isPro}
            onRedeemed={(days) => setDone(days ? `Code redeemed: ${days} days of Pro added.` : 'Code redeemed: Pro is on.')}
            onReferralCode={() => router.push('/referrals')} />
          {done ? <View style={[styles.success, { backgroundColor: c.accentSoft }]}>
            <Check size={20} color={c.accent} />
            <Text style={[styles.done, { color: c.accent }]} accessibilityLiveRegion="polite">{done}</Text>
          </View> : null}
        </View>
        <Pressable testID="pro-refer" accessibilityRole="button" onPress={() => router.push('/referrals')}
          style={({ pressed }) => [styles.refer, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
          <View style={[styles.referIcon, { backgroundColor: c.accentSoft }]}><Gift size={20} color={c.accent} /></View>
          <View style={styles.memberCopy}>
            <Text style={[styles.memberTitle, { color: c.text }]}>Or earn Pro free</Text>
            <Text style={[styles.memberDetail, { color: c.mutedText }]}>Refer friends and collect Sparks. 30 Sparks = 7 days of Pro.</Text>
          </View>
          <ArrowRight size={18} color={c.mutedText} />
        </Pressable>
        <Text style={[styles.footer, { color: c.mutedText }]}>Built around your progress.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: spacing['3xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  back: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: type.weight.bold, fontSize: 17 },
  inviteLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
  redeem: { marginTop: spacing['2xl'], gap: spacing.md },
  success: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: radii.md },
  done: { flex: 1, fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 20 },
  refer: { marginTop: spacing.xl, borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  referIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  footer: { fontFamily: type.weight.medium, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
});
