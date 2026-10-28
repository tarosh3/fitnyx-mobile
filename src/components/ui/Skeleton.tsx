import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii } from '@/src/styles/tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One placeholder block that pulses while content loads. Sized to match the
 * real element so the layout doesn't shift when data arrives. The pulse pauses
 * under Reduce Motion (static block), and the colour follows the theme.
 */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const c = useThemeColors();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.55;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.4 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: c.card }, animatedStyle, style]}
    />
  );
}
