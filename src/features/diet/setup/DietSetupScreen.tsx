import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing } from '@/src/styles/tokens';
import { DietSetup } from './DietSetup';

/** "Change diet plan": answer the questions again and Filo builds a new plan. */
export function DietSetupScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Your diet plan" subtitle="Answer a few questions for a new plan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {user ? <DietSetup userId={user.id} onCreated={() => router.back()} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'] },
});
