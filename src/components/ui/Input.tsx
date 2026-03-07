import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

export function Input(props: TextInputProps) {
  const palette = useThemeColors();

  return (
    <TextInput
      placeholderTextColor={palette.mutedText}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          color: palette.text,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
