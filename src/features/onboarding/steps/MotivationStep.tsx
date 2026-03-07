import React, { useState } from 'react';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/features/onboarding/steps/ChoiceCard';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const MOTIVATIONS = [
  { id: 'seeing_progress', label: 'Seeing progress & stats', emoji: '📊', description: 'Data-driven results' },
  { id: 'achieving_goals', label: 'Achieving goals', emoji: '🏆', description: 'Hitting milestones' },
  { id: 'reminders', label: 'Reminders & discipline', emoji: '🔔', description: 'Stay on track' },
  { id: 'fun_workouts', label: 'Fun workouts', emoji: '🎵', description: 'Enjoyable sessions' },
  { id: 'mental_wellbeing', label: 'Mental well-being', emoji: '🧠', description: 'Stress relief & focus' },
];

export function MotivationStep({ data, onNext, saving }: OnboardingStepProps) {
  const [selected, setSelected] = useState(data?.fitness_profile?.motivation || '');

  return (
    <StepScaffold
      title="What motivates you the most?"
      subtitle="This helps us keep you engaged."
      onContinue={() => onNext({ motivation: selected })}
      continueLabel="Complete Setup"
      saving={saving}
      disabled={!selected}
    >
      <View style={{ gap: 10 }}>
        {MOTIVATIONS.map((motivation) => (
          <ChoiceCard
            key={motivation.id}
            label={motivation.label}
            description={motivation.description}
            emoji={motivation.emoji}
            selected={selected === motivation.id}
            onPress={() => setSelected(motivation.id)}
          />
        ))}
      </View>
    </StepScaffold>
  );
}
