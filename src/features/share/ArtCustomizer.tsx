import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ARTWORK_LABELS, type ArtworkSelection, type ArtworkSubject } from '@/src/features/share/artwork';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

const APPEARANCES: { value: ArtworkSelection; label: string }[] = [
  { value: 'auto', label: 'From profile' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
];

/** "Make it yours": who appears in the illustration and which activity it shows. */
export function ArtCustomizer({ appearance, subject, inferredSubject, choices, disabled, onAppearance, onSubject }: {
  appearance: ArtworkSelection;
  subject: ArtworkSubject | 'auto';
  inferredSubject: ArtworkSubject;
  choices: ArtworkSubject[];
  disabled: boolean;
  onAppearance: (value: ArtworkSelection) => void;
  onSubject: (value: ArtworkSubject | 'auto') => void;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: c.mutedText }]}>MAKE IT YOURS</Text>
      <ArtOptions
        label="Illustration appearance"
        value={appearance}
        disabled={disabled}
        options={APPEARANCES}
        onChange={(value) => onAppearance(value as ArtworkSelection)}
      />
      <ArtOptions
        label="Illustration activity"
        value={subject !== 'auto' && choices.includes(subject) ? subject : 'auto'}
        disabled={disabled}
        options={[
          { value: 'auto', label: `Auto · ${ARTWORK_LABELS[inferredSubject]}` },
          ...choices.map((value) => ({ value, label: ARTWORK_LABELS[value] })),
        ]}
        onChange={(value) => onSubject(value as ArtworkSubject | 'auto')}
      />
    </View>
  );
}

function ArtOptions({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const c = useThemeColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={label} contentContainerStyle={{ gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${option.label}`}
          accessibilityState={{ checked: value === option.value, disabled }}
          onPress={() => {
            if (value !== option.value) onChange(option.value);
          }}
          style={[
            styles.option,
            {
              borderColor: value === option.value ? c.primary : c.border,
              backgroundColor: value === option.value ? c.accentSoft : c.surface,
            },
          ]}
        >
          <Text style={[styles.optionText, { color: value === option.value ? c.accent : c.text }]}>{option.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, gap: 10 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.1 },
  option: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, minHeight: 44, justifyContent: 'center' },
  optionText: { fontFamily: type.weight.semibold, fontSize: 12 },
});
