import { Share2 } from 'lucide-react-native';
import React from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { shareMessage } from '@/src/features/referrals/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The user's own referral code, big, with Share. Long-press the code to copy it. */
export function ShareCodeCard({ code, needed }: { code: string; needed: number }) {
  const c = useThemeColors();
  const share = () => { Share.share({ message: shareMessage(code) }).catch(() => undefined); };
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="referral-code-card">
      <Text style={[styles.eyebrow, { color: c.mutedText }]}>YOUR REFERRAL CODE</Text>
      <Text selectable style={[styles.code, { color: c.text }]} accessibilityLabel={`Your referral code ${code.split('').join(' ')}`}
        testID="referral-code">{code}</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>
        Friends enter it in their first 14 days. Once one has been active on {needed} days, you earn a Spark.
      </Text>
      <Button testID="referral-share" title="Share my code" icon={<Share2 size={18} color={c.primaryText} />} onPress={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 11, letterSpacing: 1.2, textAlign: 'center' },
  code: { fontFamily: type.weight.extrabold, fontSize: 34, letterSpacing: 6, textAlign: 'center', fontVariant: ['tabular-nums'] },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
