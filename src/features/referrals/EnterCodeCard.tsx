import { UserPlus } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { codeKind, REFERRAL_CODE_LENGTH, referralErrorMessage, sanitizeCode } from '@/src/features/referrals/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { applyReferralCode, type ReferredBy } from '@/src/lib/api/referrals';
import { radii, spacing, type } from '@/src/styles/tokens';

const sanitize = (t: string) => sanitizeCode(t).slice(0, 12);

/** "Referred by a friend?": enter their code once, any time. It can't be changed afterwards. */
export function EnterCodeCard({ onApplied }: { onApplied: (by: ReferredBy) => void }) {
  const c = useThemeColors();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // A ref, not just state: state only disables after a render, so a fast double
  // tap sent two applies and the second showed "already referred".
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const kind = codeKind(code);

  const apply = async () => {
    if (busyRef.current) return;
    if (kind === 'pro') { setError("That's a Pro code. Enter it under Get Pro → Pro code."); return; }
    if (kind !== 'referral') return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await applyReferralCode(code);
      Keyboard.dismiss();
      onApplied(res.referred_by);
    } catch (e) {
      setError(referralErrorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="referral-enter">
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><UserPlus size={20} color={c.accent} /></View>
        <Text style={[styles.title, { color: c.text }]}>Referred by a friend?</Text>
      </View>
      <Text style={[styles.body, { color: c.mutedText }]}>
        Enter their code once. They'll see your username and how many days you've been active until they earn their Spark.
      </Text>
      <Input value={code} onChangeText={(v) => { setCode(v); setError(null); }} sanitize={sanitize}
        placeholder="XXXXXXX" label="Friend's referral code" editable={!busy} autoCapitalize="characters"
        autoCorrect={false} autoComplete="off" accessibilityLabel="Friend's referral code" returnKeyType="done"
        onSubmitEditing={apply} style={[styles.input, { backgroundColor: c.background }]} testID="referral-enter-input" />
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      <Button testID="referral-enter-submit" title="Use this code" variant="secondary" loading={busy}
        disabled={kind === 'other'} onPress={apply} />
      <Text style={[styles.caption, { color: c.mutedText }]}>{REFERRAL_CODE_LENGTH} characters · can't be changed later</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
  input: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  error: { fontFamily: type.weight.semibold, fontSize: 13, textAlign: 'center' },
  caption: { fontFamily: type.weight.regular, fontSize: 11, textAlign: 'center' },
});
