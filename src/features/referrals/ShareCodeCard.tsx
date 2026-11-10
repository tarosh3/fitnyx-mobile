import { Share2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { shareMessage } from '@/src/features/referrals/model';
import { ReferralArtwork } from '@/src/features/referrals/ReferralArtwork';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** An invitation ticket. Native text selection keeps copying available without another dependency. */
export function ShareCodeCard({ code, needed }: { code: string; needed: number }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const [error, setError] = useState(false);
  const sharing = useRef(false);
  const share = async () => {
    if (sharing.current) return;
    sharing.current = true;
    setError(false);
    void Haptics.selectionAsync().catch(() => undefined);
    try { await Share.share({ message: shareMessage(code) }); }
    catch { setError(true); }
    finally { sharing.current = false; }
  };
  return (
    <View style={[styles.card, { backgroundColor: c.share.night.panel }]} testID="referral-code-card">
      <View style={styles.intro}>
        <View style={styles.topline}>
          <Text style={[styles.eyebrow, { color: c.share.night.ink }]}>THE FITNYX FRIEND CLUB</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.headline, { color: c.share.night.ink }, width < 360 && { fontSize: 30, lineHeight: 37 }]}>{'GOOD ENERGY.\nBETTER TOGETHER.'}</Text>
        <Text style={[styles.lead, { color: c.share.night.panelMuted }]}>Bring your people. Turn their momentum into Pro for you.</Text>
      </View>
      <View style={styles.art} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ReferralArtwork /></View>
      <View style={[styles.ticket, { borderColor: c.share.night.panelMuted }]}>
        <View style={[styles.notch, styles.leftNotch, { backgroundColor: c.background }]} />
        <View style={[styles.notch, styles.rightNotch, { backgroundColor: c.background }]} />
        <Text style={[styles.eyebrow, { color: c.share.night.panelMuted }]}>YOUR INVITATION CODE</Text>
        <Text selectable adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.code, { color: c.share.night.ink }]} accessibilityLabel={`Your referral code ${code.split('').join(' ')}`}
          testID="referral-code">{code}</Text>
        <Text style={[styles.hint, { color: c.share.night.panelMuted }]}>Hold the code to copy · or send an invite</Text>
        <Pressable testID="referral-share" accessibilityRole="button" accessibilityLabel="Share my code" onPress={share}
          style={({ pressed }) => [styles.share, { backgroundColor: c.share.night.ink }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
          <Share2 size={18} color={c.share.night.text} /><Text style={[styles.shareLabel, { color: c.share.night.text }]}>Share my code</Text>
        </Pressable>
        <Text style={[styles.body, { color: c.share.night.panelMuted }]}>A friend enters your code, then completes {needed} active days. You earn 1 Spark.</Text>
        {error ? <Text accessibilityRole="alert" style={[styles.body, { color: c.share.night.ink }]}>Couldn't open sharing. Try again, or hold your code to copy it.</Text> : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radii['2xl'], overflow: 'hidden' },
  intro: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.6, lineHeight: 16 },
  headline: { ...type.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.4, marginTop: spacing.md },
  lead: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 20, marginTop: spacing.sm, maxWidth: 290 },
  art: { height: 166, marginTop: spacing.sm },
  ticket: { borderTopWidth: 1, borderStyle: 'dashed', padding: spacing.lg, alignItems: 'stretch', gap: spacing.sm },
  notch: { position: 'absolute', width: 22, height: 22, borderRadius: radii.pill, top: -11 },
  leftNotch: { left: -11 }, rightNotch: { right: -11 },
  code: { fontFamily: type.weight.extrabold, fontSize: 30, letterSpacing: 5, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: type.weight.medium, fontSize: 11, lineHeight: 17 },
  share: { marginTop: spacing.sm, minHeight: 56, borderRadius: radii.lg, padding: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  shareLabel: { fontFamily: type.weight.bold, fontSize: 17, flexShrink: 1 },
  body: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
});
