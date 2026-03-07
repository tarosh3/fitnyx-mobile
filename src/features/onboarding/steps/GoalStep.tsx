import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const GOALS = [
  { id: 'lose_fat', label: 'Reduce Body Fat', emoji: '🔥', description: 'Burn calories and slim down' },
  { id: 'build_muscle', label: 'Gain Muscle', emoji: '💪', description: 'Build strength and size' },
  { id: 'improve_strength', label: 'Improve Strength', emoji: '⚡', description: 'Get stronger overall' },
  { id: 'improve_flexibility', label: 'Stay Active', emoji: '🧘', description: 'Flexibility & mobility' },
  { id: 'improve_health', label: 'Overall Health', emoji: '❤️', description: 'Feel better every day' },
  { id: 'reduce_stress', label: 'Boost Energy', emoji: '🧠', description: 'Reduce stress & fatigue' },
];

export function GoalStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.primary_goal || '');

  return (
    <StepScaffold
      title="What is your primary fitness goal?"
      subtitle="Choose the goal that matters most to you."
      onContinue={() => onNext({ primary_goal: selected })}
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {GOALS.map((goal) => (
          <ChoiceCard
            key={goal.id}
            label={goal.label}
            description={goal.description}
            emoji={goal.emoji}
            selected={selected === goal.id}
            onPress={() => setSelected(goal.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
