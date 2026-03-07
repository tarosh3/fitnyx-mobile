import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function VerificationFailedScreen() {
  const router = useRouter();
  const palette = useThemeColors();

  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={styles.emoji}>❌</Text>
        <Text style={[styles.title, { color: palette.text }]}>We couldn&apos;t verify your email.</Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>The link may have expired or already been used. Please request a new one.</Text>
        <Button title="Back to Login" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    width: '100%',
  },
  emoji: {
    fontSize: 42,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
