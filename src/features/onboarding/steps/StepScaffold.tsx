import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const PRIMARY = '#5FC793';

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
      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.header}>
        {/* Accent glow dot */}
        <View style={styles.accentRow}>
          <View style={styles.glowDot} />
          <View style={styles.accentLine} />
        </View>

        <Text style={styles.title}>
          <Text style={{ color: PRIMARY }}>{titleParts.first}</Text>
          <Text style={{ color: palette.text }}>{titleParts.rest}</Text>
        </Text>

        <Text style={[styles.subtitle, { color: palette.mutedText }]}>{subtitle}</Text>
      </Animated.View>

      {/* Content area — vertically centered so sparse steps don't look empty */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(250)}
        style={styles.contentWrap}
      >
        <View style={styles.content}>{children}</View>

        {error ? (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.error}>
            {error}
          </Animated.Text>
        ) : null}
      </Animated.View>

      {/* Continue button with green glow */}
      <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.buttonWrap}>
        <Pressable
          onPress={onContinue}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.button,
            isDisabled && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {saving ? (
            <Text style={styles.buttonText}>...</Text>
          ) : (
            <Text style={styles.buttonText}>{continueLabel.toUpperCase()}</Text>
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
  accentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  glowDot: {
    backgroundColor: PRIMARY,
    borderRadius: 5,
    height: 10,
    width: 10,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  accentLine: {
    backgroundColor: `${PRIMARY}40`,
    borderRadius: 1,
    height: 2,
    width: 40,
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
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: 10,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  buttonWrap: {
    marginTop: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
});
