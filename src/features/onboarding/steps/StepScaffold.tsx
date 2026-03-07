import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface StepScaffoldProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  error?: string;
}

export function StepScaffold({
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  saving = false,
  disabled = false,
  error,
}: StepScaffoldProps) {
  const palette = useThemeColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.main}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>{subtitle}</Text>

        <View style={styles.content}>{children}</View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Button title={continueLabel} onPress={onContinue} loading={saving} disabled={disabled || saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 16,
    paddingBottom: 10,
  },
  main: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  content: {
    gap: 10,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
});
