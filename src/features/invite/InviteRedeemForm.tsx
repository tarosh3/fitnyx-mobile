import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { registerSession } from '@/src/lib/api/auth';
import { redeemInviteCode } from '@/src/lib/api/invites';
import { useAuth } from '@/src/providers/AuthProvider';

// Keep only characters the backend accepts (A-Z, 2-9); uppercase as-you-type.
const sanitizeCode = (text: string) => text.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 10);

export function InviteRedeemForm({ submitLabel = 'Redeem code' }: { submitLabel?: string }) {
  const palette = useThemeColors();
  const { onInviteRedeemed } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (code.length !== 10 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await redeemInviteCode(code);
      await registerSession();
      await onInviteRedeemed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to redeem code');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {/* No maxLength: RN truncates BEFORE onChangeText, so pasting a formatted
          code like "ABCD-EF23-45" would lose its tail. sanitizeCode already
          strips separators and slices to 10. */}
      <Input
        value={code}
        onChangeText={setCode}
        sanitize={sanitizeCode}
        placeholder="ENTER INVITE CODE"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        style={styles.codeInput}
      />
      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${palette.destructive}15`, borderColor: `${palette.destructive}40` }]}>
          <Text style={[styles.errorText, { color: palette.destructive }]}>{error}</Text>
        </View>
      )}
      <Button
        title={submitting ? 'Redeeming…' : submitLabel}
        onPress={handleSubmit}
        disabled={code.length !== 10 || submitting}
        loading={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    width: '100%',
  },
  codeInput: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
