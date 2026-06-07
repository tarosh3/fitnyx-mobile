import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Field({
  label,
  error,
  helper,
  leading,
  trailing,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.destructive : focused ? c.primary : c.border;

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: c.mutedText }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: c.surface, borderColor },
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={c.mutedText}
          style={[styles.input, { color: c.text }]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.helper, { color: c.destructive }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: c.mutedText }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.xs,
    letterSpacing: type.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  leading: {
    paddingRight: spacing.sm,
  },
  trailing: {
    paddingLeft: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: type.weight.medium,
    fontSize: type.size.body,
    paddingVertical: spacing.md,
  },
  helper: {
    fontFamily: type.weight.regular,
    fontSize: type.size.xs,
    marginTop: spacing.xxs,
  },
});
