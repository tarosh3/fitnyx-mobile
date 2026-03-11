import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { sanitizeGeneralText, MAX_MEDIUM_TEXT } from '@/src/lib/validators';

const INJURIES = [
  { id: 'none', label: 'No injuries', emoji: '🚫' },
  { id: 'knee_pain', label: 'Knee pain', emoji: '🦵' },
  { id: 'back_pain', label: 'Back pain', emoji: '🔙' },
  { id: 'shoulder_pain', label: 'Shoulder pain', emoji: '💪' },
  { id: 'other', label: 'Other', emoji: '❓' },
];

export function InjuriesStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState<string[]>(data?.fitness_profile?.injuries || []);
  const [otherText, setOtherText] = useState(data?.fitness_profile?.injuries_other || '');

  const toggle = (id: string) => {
    if (id === 'none') {
      setSelected(['none']);
      return;
    }

    setSelected((prev) => {
      const cleaned = prev.filter((value) => value !== 'none');
      if (cleaned.includes(id)) {
        return cleaned.filter((value) => value !== id);
      }
      return [...cleaned, id];
    });
  };

  return (
    <StepScaffold
      title="Any injuries or limitations?"
      subtitle="We'll avoid exercises that might aggravate them."
      onContinue={() => onNext({ injuries: selected.length ? selected : ['none'], injuries_other: otherText })}
      saving={saving}
    >
      <View style={styles.list}>
        {INJURIES.map((injury) => (
          <ChoiceCard
            key={injury.id}
            label={injury.label}
            emoji={injury.emoji}
            selected={selected.includes(injury.id)}
            onPress={() => toggle(injury.id)}
          />
        ))}
      </View>

      {selected.includes('other') ? (
        <Input
          value={otherText}
          onChangeText={setOtherText}
          placeholder="Describe your injury..."
          sanitize={(v) => sanitizeGeneralText(v, MAX_MEDIUM_TEXT)}
          maxLength={MAX_MEDIUM_TEXT}
        />
      ) : null}
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
});
