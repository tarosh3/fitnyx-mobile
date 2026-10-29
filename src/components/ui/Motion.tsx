import React, { useEffect } from 'react';
import { TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { motion } from '@/src/styles/tokens';

const timing = { duration: motion.duration.slow, reduceMotion: ReduceMotion.System };
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/** Short mount-only entrances, capped so content never waits on a long stagger. */
export function Entrance({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(Math.min(delay, 210), withTiming(1, timing), ReduceMotion.System);
    return () => cancelAnimation(progress);
  }, [delay, progress]);
  const animated = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 8 }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A single warm pulse on arrival; never an endless animation while reading. */
export function StreakPulse({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active) scale.value = withSequence(withTiming(1.15, timing), withTiming(1, timing));
    else scale.value = 1;
    return () => cancelAnimation(scale);
  }, [active, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

/** UI-thread integer count-up; assistive tech always reads the final value. */
export function AnimatedCount({ value, label, style }: { value: number; label: string; style?: StyleProp<TextStyle> }) {
  const target = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  const count = useSharedValue(0);
  useEffect(() => {
    count.value = withTiming(target, { duration: 650, reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(count);
  }, [target, count]);
  const animatedProps = useAnimatedProps(() => {
    const text = Math.round(count.value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return { text, defaultValue: text };
  });
  return (
    <View accessible accessibilityLabel={`${target.toLocaleString()} ${label}`} style={{ alignSelf: 'stretch' }}>
      <AnimatedInput animatedProps={animatedProps} defaultValue={target.toLocaleString()} editable={false}
        caretHidden pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        underlineColorAndroid="transparent" style={[style, { padding: 0, margin: 0, textAlign: 'center', fontVariant: ['tabular-nums'] }]} />
    </View>
  );
}
