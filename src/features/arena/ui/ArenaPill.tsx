import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** A compact header link into the Arena (Progress tab). */
export function ArenaPill() {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <Pressable testID="progress-arena" onPress={() => router.push('/arena' as never)} accessibilityRole="button" accessibilityLabel="Arena leaderboards"
      hitSlop={6} style={({ pressed }) => [styles.pill, { backgroundColor: c.accentSoft }, pressed && styles.pressed]}>
      <Trophy size={16} color={c.accent} />
      <Text style={[styles.text, { color: c.accent }]}>Arena</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill },
  pressed: { opacity: 0.8 },
  text: { fontFamily: type.weight.bold, fontSize: 14 },
});
