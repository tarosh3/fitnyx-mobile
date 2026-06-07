import React, { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { motion, radii, spacing, type } from '@/src/styles/tokens';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const c = useThemeColors();
  const widthSV = useSharedValue(0);
  const indexSV = useSharedValue(options.findIndex((o) => o.value === value));

  useEffect(() => {
    const next = options.findIndex((o) => o.value === value);
    if (next >= 0) indexSV.value = withSpring(next, motion.spring.snappy);
  }, [value, options, indexSV]);

  const onLayout = (e: LayoutChangeEvent) => {
    widthSV.value = e.nativeEvent.layout.width / options.length;
  };

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indexSV.value * widthSV.value }],
    width: widthSV.value,
  }));

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: c.primary },
          thumbStyle,
        ]}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={styles.option}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[
                styles.label,
                { color: active ? c.primaryText : c.mutedText },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    minHeight: 40,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: radii.pill,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.sm,
    letterSpacing: type.tracking.wide,
  },
});
