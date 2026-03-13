import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const PRIMARY = '#5FC793';

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
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.card,
        {
          borderColor: selected ? PRIMARY : palette.border,
          backgroundColor: selected ? `${PRIMARY}15` : palette.card,
        },
        selected && styles.cardSelectedShadow,
      ]}
    >
      {/* Emoji in circular badge */}
      {emoji ? (
        <View
          style={[
            styles.emojiBadge,
            {
              backgroundColor: selected ? `${PRIMARY}30` : `${palette.text}10`,
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
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
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
  cardSelectedShadow: {
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
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
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkMark: {
    color: '#000',
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
