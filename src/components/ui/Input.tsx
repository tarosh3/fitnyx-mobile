import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Security: optional sanitiser applied to input on every keystroke */
  sanitize?: (text: string) => string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, style, containerStyle, placeholderTextColor, sanitize, onChangeText, ...props }, ref) => {
    const palette = useThemeColors();

    // Security: wrap onChangeText to apply sanitiser before propagating
    const handleChangeText = (text: string) => {
      const cleaned = sanitize ? sanitize(text) : text;
      onChangeText?.(cleaned);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, { color: palette.text }]}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              backgroundColor: palette.card,
              borderColor: error ? palette.destructive : palette.border,
              color: palette.text,
            },
            style,
          ]}
          placeholderTextColor={placeholderTextColor || palette.mutedText}
          onChangeText={handleChangeText}
          {...props}
        />
        {error && <Text style={[styles.error, { color: palette.destructive }]}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  error: {
    fontSize: 12,
    marginLeft: 4,
    marginTop: 2,
  },
});
