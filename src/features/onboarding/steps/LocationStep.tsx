import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const LOCATIONS = [
  { id: 'home_no_equipment', label: 'At home (no equipment)', emoji: '🏠', description: 'Bodyweight workouts' },
  { id: 'home_with_equipment', label: 'At home (some equipment)', emoji: '🏠', description: 'Dumbbells, bands, etc.' },
  { id: 'gym', label: 'Gym', emoji: '🏋️', description: 'Full gym access' },
  { id: 'mix', label: 'Mix of both', emoji: '🔄', description: 'Flexible approach' },
];

export function LocationStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.workout_location || '');

  return (
    <StepScaffold
      title="Where do you usually work out?"
      subtitle="We'll recommend appropriate exercises."
      onContinue={() => onNext({ workout_location: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {LOCATIONS.map((location) => (
          <ChoiceCard
            key={location.id}
            label={location.label}
            description={location.description}
            emoji={location.emoji}
            selected={selected === location.id}
            onPress={() => setSelected(location.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
