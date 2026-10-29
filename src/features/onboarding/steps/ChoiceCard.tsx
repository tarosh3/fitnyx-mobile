import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const AnimatedPressable = Animated.createAnimatedComponent(
  require('react-native').Pressable
);

interface ChoiceCardProps {
  label: string;
  description?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}

export function ChoiceCard({ label, description, emoji, selected, onPress }: ChoiceCardProps) {
  const palette = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200, reduceMotion: ReduceMotion.System });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200, reduceMotion: ReduceMotion.System });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.card,
        {
          borderColor: selected ? palette.accent : palette.border,
          backgroundColor: selected ? palette.accentSoft : palette.card,
        },
      ]}
    >
      {/* Emoji in circular badge */}
      {emoji ? (
        <View
          style={[
            styles.emojiBadge,
            {
              backgroundColor: selected ? palette.accentSoft : palette.surface,
            },
          ]}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
      ) : null}

      {/* Text content */}
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: palette.mutedText }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Green checkmark circle when selected */}
      {selected ? (
        <View style={[styles.checkCircle, { backgroundColor: palette.primary }]}>
          <Text style={[styles.checkMark, { color: palette.primaryText }]}>✓</Text>
        </View>
      ) : (
        <View style={[styles.emptyCircle, { borderColor: palette.border }]} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emojiBadge: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emoji: {
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCircle: {
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
});
