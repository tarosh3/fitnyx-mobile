import { StepArtwork } from '../StepArtwork';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ReduceMotion } from 'react-native-reanimated';

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
  const isDisabled = disabled || saving;

  // Split title so the first word gets the accent color
  const titleParts = useMemo(() => {
    const idx = title.indexOf(' ');
    if (idx === -1) return { first: title, rest: '' };
    return { first: title.slice(0, idx), rest: title.slice(idx) };
  }, [title]);

  return (
    <View style={styles.wrap}>
      {/* Header area with entrance animation */}
      <Animated.View entering={FadeInDown.duration(500).delay(100).reduceMotion(ReduceMotion.System)} style={styles.header}>
        {/* A distinct, compact vignette for the current step. */}
        <StepArtwork />

        <Text style={styles.title}>
          <Text style={{ color: palette.accent }}>{titleParts.first}</Text>
          <Text style={{ color: palette.text }}>{titleParts.rest}</Text>
        </Text>

        <Text style={[styles.subtitle, { color: palette.mutedText }]}>{subtitle}</Text>
      </Animated.View>

      {/* Content area — vertically centered so sparse steps don't look empty */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentWrap}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>{children}</View>

        {error ? (
          <Animated.Text entering={FadeInDown.duration(300).reduceMotion(ReduceMotion.System)} style={[styles.error, { color: palette.destructive }]}>
            {error}
          </Animated.Text>
        ) : null}
      </Animated.ScrollView>

      {/* Keep the primary action pinned below the scrollable choices. */}
      <Animated.View entering={FadeInUp.duration(400).delay(400).reduceMotion(ReduceMotion.System)} style={styles.buttonWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, busy: saving }}
          onPress={onContinue}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.primary },
            isDisabled && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {saving ? (
            <Text style={[styles.buttonText, { color: palette.primaryText }]}>...</Text>
          ) : (
            <Text style={[styles.buttonText, { color: palette.primaryText }]}>{continueLabel.toUpperCase()}</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingBottom: 10,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  contentWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  content: {
    gap: 10,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  buttonWrap: {
    marginTop: 16,
  },
  button: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
});
