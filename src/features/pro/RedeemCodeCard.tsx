import { ArrowRight, Ticket } from 'lucide-react-native';
import React, { forwardRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { refreshEntitlement } from '@/src/features/pro/store';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { redeemInviteCode } from '@/src/lib/api/invites';
import { radii, spacing, type } from '@/src/styles/tokens';

// The backend accepts A-Z and 2-9 (no 0/O/1/I/L/U); uppercase as you type.
const sanitize = (t: string) => t.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 10);
const CODE_LENGTH = 10;

/** "Have an invite code?": redeeming one gives Pro for the code's days. */
export const RedeemCodeCard = forwardRef<TextInput, { pro: boolean; onRedeemed: (days: number | null) => void }>(
  function RedeemCodeCard({ pro, onRedeemed }, ref) {
    const c = useThemeColors();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const redeem = async () => {
      if (code.length !== CODE_LENGTH || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await redeemInviteCode(code);
        await refreshEntitlement();
        setCode('');
        Keyboard.dismiss();
        onRedeemed(res.duration_days ?? null);
      } catch (e) {
        // A RedeemError carries the backend's reason; anything else is the connection.
        setError((e as { isRedeemError?: boolean }).isRedeemError
          ? (e as Error).message
          : "Couldn't reach FitNyx. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
    };

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="pro-redeem">
        <View style={styles.head}>
          <View style={[styles.ticket, { backgroundColor: c.accentSoft }]}><Ticket size={22} color={c.accent} /></View>
          <Text style={[styles.title, { color: c.text }]}>{pro ? 'Keep your momentum.' : 'Your next level starts here.'}</Text>
        </View>
        <Text style={[styles.body, { color: c.mutedText }]}>{pro ? 'Have another invite? Add its days to your current Pro access.' : 'Have an invite code? Enter it below to unlock your Pro benefits.'}</Text>
        {/* No maxLength: RN truncates before onChangeText, so a pasted "ABCD-EF23-45" would lose its tail. */}
        <Input ref={ref} value={code} onChangeText={(value) => { setCode(value); setError(null); }} sanitize={sanitize} placeholder="XXXXXXXXXX" label="Invite code" editable={!busy}
          autoCapitalize="characters" autoCorrect={false} autoComplete="off" accessibilityLabel="Invite code"
          returnKeyType="done" onSubmitEditing={redeem} style={[styles.input, { backgroundColor: c.background }]} />
        {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
        <Button testID="pro-redeem-submit" title={pro ? "Extend my Pro access" : "Activate my Pro access"} iconAfter={<ArrowRight size={18} color={c.primaryText} />} loading={busy} disabled={code.length !== CODE_LENGTH} onPress={redeem} />
        <Text style={[styles.caption, { color: c.mutedText }]}>10 characters · Access for the duration of your invite</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.base },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ticket: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  caption: { fontFamily: type.weight.regular, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  title: { flex: 1, fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
  input: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  error: { fontFamily: type.weight.semibold, fontSize: 13, textAlign: 'center' },
});
