import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The way in for someone who doesn't know what to train today. */
export function TodayPickCard({ testID = 'today-pick' }: { testID?: string }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <Pressable testID={testID} onPress={() => router.push('/workouts/today')} accessibilityRole="button"
      accessibilityLabel="Not sure what to train? Get today’s workout, with sets, reps and weights from your log"
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.75 }]}>
      <View style={[styles.icon, { backgroundColor: c.surface }]}><Sparkles size={20} color={c.accent} /></View>
      <View style={styles.grow}>
        <Text style={[styles.title, { color: c.text }]}>Not sure what to train?</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>Get today’s workout, with sets, reps and weights from your log</Text>
      </View>
      <ChevronRight size={20} color={c.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 19 },
});
