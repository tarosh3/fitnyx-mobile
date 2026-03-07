import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', emoji: '🐣', description: 'Just starting my fitness journey' },
  { id: 'intermediate', label: 'Intermediate', emoji: '🙂', description: 'I work out sometimes' },
  { id: 'advanced', label: 'Advanced', emoji: '💪', description: 'I train regularly' },
];

export function ExperienceStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.experience_level || '');

  return (
    <StepScaffold
      title="How experienced are you with workouts?"
      subtitle="We'll adjust the difficulty accordingly."
      onContinue={() => onNext({ experience_level: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {LEVELS.map((level) => (
          <ChoiceCard
            key={level.id}
            label={level.label}
            description={level.description}
            emoji={level.emoji}
            selected={selected === level.id}
            onPress={() => setSelected(level.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
