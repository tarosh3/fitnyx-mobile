import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing } from '@/src/styles/tokens';
import { DietSetup } from './DietSetup';

/** "Change diet plan": answer the questions again and Filo builds a new plan. */
export function DietSetupScreen() {
  const c = useThemeColors();
  const scroll = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuth();
  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Your nutrition plan" subtitle="Personalised around you" onBack={() => router.back()} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {user ? <DietSetup userId={user.id} onCreated={() => router.back()} onStepChange={() => scroll.current?.scrollTo({ y: 0, animated: true })} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'] },
});
