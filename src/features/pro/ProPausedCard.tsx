import { useRouter } from 'expo-router';
import { ProIcon } from '@/src/features/pro/ProIcon';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** In place of the next workout when the program's Pro has ended. */
export function ProPausedCard() {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.primary }]} testID="program-paused">
      <View style={styles.head}>
        <ProIcon size={18} color={c.accent} />
        <Text style={[styles.title, { color: c.text }]}>Your program is paused</Text>
      </View>
      <Text style={[styles.body, { color: c.mutedText }]}>
        Fresh targets for each workout and the weekly check-in are part of Pro. Your workouts keep their saved targets meanwhile.
      </Text>
      <Button testID="program-paused-pro" title="See Pro" onPress={() => router.push('/pro')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1.5, padding: spacing.base, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 17 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
});
