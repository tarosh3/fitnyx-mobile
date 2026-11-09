import { useRouter } from 'expo-router';
import { Crown } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ProTag } from '@/src/features/pro/ProTag';
import { useEntitlement } from '@/src/features/pro/store';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** On the profile: the PRO mark, or a "Get Pro" pill that opens the Pro screen. Nothing until the plan is known. */
export function PlanPill() {
  const c = useThemeColors();
  const router = useRouter();
  const { isPro, loaded } = useEntitlement();
  if (!loaded) return null;
  if (isPro) return <ProTag />;
  return (
    <Pressable testID="plan-pill-get-pro" onPress={() => router.push('/pro')} accessibilityRole="button" accessibilityLabel="Get Pro" hitSlop={8}
      style={({ pressed }) => [styles.pill, { borderColor: c.primary }, pressed && { opacity: 0.7 }]}>
      <Crown size={12} color={c.accent} />
      <Text style={[styles.text, { color: c.accent }]}>Get Pro</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontFamily: type.weight.semibold, fontSize: 12.5 },
});
