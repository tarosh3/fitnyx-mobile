import React, { useEffect } from 'react';
import { Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
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

/** UI-thread count-up; assistive tech always reads the final value. */
export function AnimatedCount({ value, label, style, decimals = 0, minDigits = 1, inline = false }: {
  value: number; label: string; style?: StyleProp<TextStyle>; decimals?: number; minDigits?: number; inline?: boolean;
}) {
  const precision = Math.min(2, Math.max(0, decimals));
  const target = Math.max(0, Number.isFinite(value) ? Number(value.toFixed(precision)) : 0);
  const format = (n: number) => {
    'worklet';
    const [whole, fraction] = n.toFixed(precision).split('.');
    const integer = whole.padStart(minDigits, '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return precision ? `${integer}.${fraction}` : integer;
  };
  const finalText = format(target);
  const count = useSharedValue(0);
  useEffect(() => {
    count.value = withTiming(target, { duration: 650, reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(count);
  }, [target, count]);
  const animatedProps = useAnimatedProps(() => {
    const text = format(count.value);
    return { text, defaultValue: text };
  });
  return (
    <View accessible accessibilityLabel={`${finalText} ${label}`.trim()} style={{ alignSelf: inline ? 'baseline' : 'stretch', flexShrink: 1 }}>
      {/* Reserve the final value's width so neither digits nor units move as it counts. */}
      <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        numberOfLines={1} maxFontSizeMultiplier={inline ? 1.2 : undefined}
        style={[style, { opacity: 0, textAlign: inline ? 'left' : 'center', fontVariant: ['tabular-nums'] }]}>{finalText}</Text>
      <AnimatedInput animatedProps={animatedProps} defaultValue={finalText} editable={false}
        maxFontSizeMultiplier={inline ? 1.2 : undefined}
        caretHidden pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        underlineColorAndroid="transparent" style={[style, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: 0, margin: 0, textAlign: inline ? 'left' : 'center', fontVariant: ['tabular-nums'] }]} />
    </View>
  );
}
