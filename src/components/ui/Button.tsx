import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

interface ButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<import('react-native').TextStyle>;
}

export function Button({ title, loading = false, variant = 'primary', disabled, style, textStyle: customTextStyle, ...props }: ButtonProps) {
  const palette = useThemeColors();
  const isDisabled = Boolean(disabled || loading);

  const containerStyles = [
    styles.base,
    variant === 'primary' && { backgroundColor: palette.primary },
    variant === 'secondary' && { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 },
    variant === 'danger' && { backgroundColor: palette.destructive },
    variant === 'ghost' && { backgroundColor: 'transparent', borderColor: palette.border, borderWidth: 1 },
    variant === 'outline' && { backgroundColor: 'transparent', borderColor: palette.border, borderWidth: 1 },
    isDisabled && { opacity: 0.6 },
    style,
  ];

  const textStyles: StyleProp<import('react-native').TextStyle> = [
    styles.text,
    variant === 'primary' && { color: palette.primaryText },
    variant === 'secondary' && { color: palette.text },
    variant === 'danger' && { color: '#fff' },
    variant === 'ghost' && { color: palette.text },
    variant === 'outline' && { color: palette.text },
    customTextStyle,
  ];

  return (
    <Pressable {...props} disabled={isDisabled} style={({ pressed }) => [containerStyles as any, pressed && styles.pressed]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.primaryText : palette.text} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
