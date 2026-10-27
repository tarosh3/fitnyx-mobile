import { useRouter } from 'expo-router';
import { Route } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Entry point to Roam (Home + Workouts tab). */
export function StartRoamCard() {
  const palette = useThemeColors();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/roam')}
      style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: palette.border }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel="Open Roam: track a run, walk or ride"
    >
      <View style={[styles.icon, { backgroundColor: palette.primary }]}>
        <Route size={22} color={palette.primaryText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]}>ROAM</Text>
        <Text style={[styles.sub, { color: palette.mutedText }]}>Stride · Ride — map your route, earn XP</Text>
      </View>
      <View style={[styles.cta, { borderColor: palette.primary }]}>
        <Text style={[styles.ctaText, { color: palette.primary }]}>START</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: type.weight.extrabold, letterSpacing: 1.5 },
  sub: { fontSize: 12, marginTop: 2 },
  cta: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  ctaText: { fontSize: 12, fontFamily: type.weight.extrabold, letterSpacing: 1 },
});
