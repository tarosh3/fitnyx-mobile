import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';

/** Pieces shared by the height and weight steps. */

interface UnitToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function UnitToggle<T extends string>({ options, value, onChange }: UnitToggleProps<T>) {
  const palette = useThemeColors();
  return (
    <View style={[styles.toggle, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.toggleBtn, active && { backgroundColor: palette.primary }]}
          >
            <Text style={[styles.toggleText, { color: active ? palette.primaryText : palette.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface StepButtonProps {
  kind: 'minus' | 'plus';
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function StepButton({ kind, onPress, accessibilityLabel, disabled }: StepButtonProps) {
  const palette = useThemeColors();
  const Icon = kind === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: palette.card, borderColor: palette.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={22} color={palette.text} />
    </Pressable>
  );
}

export const measureStyles = StyleSheet.create({
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 12,
  },
  valueBox: {
    alignItems: 'center',
    minWidth: 150,
  },
  value: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    minWidth: 140,
    padding: 0,
    textAlign: 'center',
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  toggleBtn: {
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 84,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
