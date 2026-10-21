import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The profile's way into the Arena, next to Friends. */
export function ArenaButton() {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <Pressable testID="open-arena" onPress={() => router.push('/arena' as never)} accessibilityRole="button" accessibilityLabel="Arena leaderboards"
      style={[styles.button, { backgroundColor: c.card, borderColor: c.border }]}>
      <Trophy size={17} color={c.text} strokeWidth={2} />
      <Text style={[styles.text, { color: c.text }]} numberOfLines={1}>Arena</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  text: { fontFamily: type.weight.bold, fontSize: 14 },
});
