import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { WeekSummary } from '@/src/features/roam/components/WeekSummary';
import { useRoamActivities } from '@/src/features/roam/useRoamActivities';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Stats tab: this week's counted Roams; tap to open Roam. Hidden until there's data. */
export function RoamStatsCard({ userId }: { userId: string | undefined }) {
  const palette = useThemeColors();
  const router = useRouter();
  const { data } = useRoamActivities(userId);
  if (!data) return null;
  return (
    <Pressable onPress={() => router.push('/roam')} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}>
      <Text style={[styles.title, { color: palette.text }]}>ROAM</Text>
      <WeekSummary week={data.week} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, gap: 10 },
  title: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});
