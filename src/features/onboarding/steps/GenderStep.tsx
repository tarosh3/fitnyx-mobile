import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const GENDERS = [
  { id: 'male', label: 'Male', emoji: '♂️' },
  { id: 'female', label: 'Female', emoji: '♀️' },
  { id: 'non_binary', label: 'Non-binary', emoji: '⚧️' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🔒' },
];

export function GenderStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.gender || '');

  return (
    <StepScaffold
      title="What's your gender?"
      subtitle="This helps us tailor exercise recommendations."
      onContinue={() => onNext({ gender: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {GENDERS.map((gender) => (
          <ChoiceCard
            key={gender.id}
            label={gender.label}
            emoji={gender.emoji}
            selected={selected === gender.id}
            onPress={() => setSelected(gender.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
