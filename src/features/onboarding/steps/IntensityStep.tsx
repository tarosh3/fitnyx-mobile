import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const INTENSITIES = [
  { id: 'easy', label: 'Easy & comfortable', emoji: '😌', description: 'Low impact, steady pace' },
  { id: 'moderate', label: 'Moderate & challenging', emoji: '😤', description: 'Push yourself but manageable' },
  { id: 'intense', label: 'Intense & pushing limits', emoji: '🔥', description: 'Maximum effort' },
];

export function IntensityStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.workout_intensity || '');

  return (
    <StepScaffold
      title="How intense should workouts be?"
      subtitle="We'll calibrate the difficulty level."
      onContinue={() => onNext({ workout_intensity: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {INTENSITIES.map((intensity) => (
          <ChoiceCard
            key={intensity.id}
            label={intensity.label}
            description={intensity.description}
            emoji={intensity.emoji}
            selected={selected === intensity.id}
            onPress={() => setSelected(intensity.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
