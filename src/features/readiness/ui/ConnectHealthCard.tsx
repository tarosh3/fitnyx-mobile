import { HeartPulse, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Home: readiness + heart rate need health sync, so say they exist and offer to connect. */
export function ConnectHealthCard({ label, onConnect, onDismiss }: { label: string; onConnect: () => Promise<unknown>; onDismiss: () => void }) {
  const c = useThemeColors();
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConnect(); } finally { setBusy(false); }
  };
  return (
    <View testID="home-connect-health" style={[styles.card, { backgroundColor: c.card }]}>
      <View style={[styles.icon, { backgroundColor: c.accentSoft }]}><HeartPulse size={22} color={c.accent} /></View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Recovery & heart rate</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>
          Connect {label} to see a daily readiness score and your heart rate on Roams. Needs a watch or ring.
        </Text>
        <Pressable onPress={connect} disabled={busy} accessibilityRole="button" accessibilityLabel={`Connect ${label}`}
          style={({ pressed }) => [styles.btn, { backgroundColor: c.accentSoft }, (pressed || busy) && styles.pressed]}>
          <Text style={[styles.btnText, { color: c.accent }]}>Connect {label}</Text>
        </Pressable>
      </View>
      <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide this card" style={styles.close}>
        <X size={18} color={c.mutedText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radii['2xl'], padding: spacing.base },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: spacing.sm },
  title: { fontFamily: type.weight.semibold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
  btn: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  btnText: { fontFamily: type.weight.semibold, fontSize: 14 },
  pressed: { opacity: 0.7 },
  close: { minWidth: 32, minHeight: 32, alignItems: 'flex-end' },
});
