import { useLocalSearchParams } from 'expo-router';
import { Crown } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { planLine } from '@/src/features/pro/model';
import { ProFeatures } from '@/src/features/pro/ProFeatures';
import { RedeemCodeCard } from '@/src/features/pro/RedeemCodeCard';
import { useEntitlement } from '@/src/features/pro/store';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/**
 * Get Pro: what it adds, Subscribe (coming with the store release) and invite codes.
 * `?redeem=1` (Settings → Invite code) jumps to the code field.
 */
export function ProScreen() {
  const c = useThemeColors();
  const { redeem } = useLocalSearchParams<{ redeem?: string }>();
  const { isPro, entitlement } = useEntitlement();
  const [done, setDone] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const codeRef = useRef<TextInput>(null);
  const redeemY = useRef(0);

  useEffect(() => {
    if (redeem !== '1') return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: redeemY.current, animated: true });
      codeRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [redeem]);

  return (
    <Screen scrollRef={scrollRef}>
      <PageHeader title="FitNyx Pro" backTo="/settings" />
      <View style={styles.sections}>
        <View style={[styles.hero, { backgroundColor: c.card, borderColor: isPro ? c.primary : c.border }]} testID="pro-hero">
          <View style={[styles.crown, { backgroundColor: c.accentSoft }]}><Crown size={26} color={c.accent} /></View>
          <Text style={[styles.heroTitle, { color: c.text }]}>{isPro ? "You're on Pro" : 'Train smarter with Pro'}</Text>
          <Text style={[styles.heroBody, { color: c.mutedText }]}>
            {isPro
              ? `${planLine(entitlement)}${entitlement?.source === 'invite' ? ', from an invite code' : ''}. Everything below is on.`
              : 'AI that knows your log: a program that adapts every week, meal photos, and Filo without limits.'}
          </Text>
        </View>
        {done ? <Text style={[styles.done, { color: c.accent }]} accessibilityLiveRegion="polite">{done}</Text> : null}
        <ProFeatures pro={isPro} />
        {isPro ? null : (
          <View style={styles.subscribe}>
            <Button testID="pro-subscribe" title="Subscribe · coming soon" disabled onPress={() => undefined} />
            <Text style={[styles.note, { color: c.mutedText }]}>
              Payments arrive with the app's store release. Until then, Pro comes with an invite code.
            </Text>
          </View>
        )}
        <View onLayout={(e) => { redeemY.current = e.nativeEvent.layout.y; }}>
          <RedeemCodeCard ref={codeRef} pro={isPro}
            onRedeemed={(days) => setDone(days ? `Code redeemed: ${days} days of Pro added.` : 'Code redeemed: Pro is on.')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.lg },
  hero: { borderRadius: radii['2xl'], borderWidth: 1.5, padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  crown: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: type.weight.extrabold, fontSize: 24, letterSpacing: -0.5 },
  heroBody: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  done: { fontFamily: type.weight.bold, fontSize: 15, textAlign: 'center' },
  subscribe: { gap: spacing.sm },
  note: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
