import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const FREQUENCIES = [
  { id: '2_3_days', label: '2–3 days a week', description: 'Light routine' },
  { id: '3_4_days', label: '3–4 days a week', description: 'Balanced approach' },
  { id: '5_6_days', label: '5–6 days a week', description: 'Committed schedule' },
  { id: 'everyday', label: 'Everyday', description: "I'm serious 😤" },
];

export function FrequencyStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.workout_frequency || '');

  return (
    <StepScaffold
      title="How often do you want to work out?"
      subtitle="We'll customize your weekly plan."
      onContinue={() => onNext({ workout_frequency: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {FREQUENCIES.map((frequency) => (
          <ChoiceCard
            key={frequency.id}
            label={frequency.label}
            description={frequency.description}
            selected={selected === frequency.id}
            onPress={() => setSelected(frequency.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
