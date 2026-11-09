import { Ticket } from 'lucide-react-native';
import React, { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
          <Ticket size={18} color={c.accent} />
          <Text style={[styles.title, { color: c.text }]}>{pro ? 'Add more Pro with a code' : 'Have an invite code?'}</Text>
        </View>
        <Text style={[styles.body, { color: c.mutedText }]}>Codes give Pro for a set number of days, added to any Pro you already have.</Text>
        {/* No maxLength: RN truncates before onChangeText, so a pasted "ABCD-EF23-45" would lose its tail. */}
        <Input ref={ref} value={code} onChangeText={setCode} sanitize={sanitize} placeholder="ENTER CODE"
          autoCapitalize="characters" autoCorrect={false} autoComplete="off" accessibilityLabel="Invite code"
          returnKeyType="done" onSubmitEditing={redeem} style={styles.input} />
        {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
        <Button testID="pro-redeem-submit" title="Redeem code" loading={busy} disabled={code.length !== CODE_LENGTH} onPress={redeem} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
  input: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: 4, textAlign: 'center' },
  error: { fontFamily: type.weight.semibold, fontSize: 13, textAlign: 'center' },
});
