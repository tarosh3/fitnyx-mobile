import React from 'react';
import { render } from '@testing-library/react-native';
import { OnboardingProgress } from '../OnboardingProgress';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

it.each([
  [1, 'Stage 1 of 3: About you. Question 1 of 5'],
  [5, 'Stage 1 of 3: About you. Question 5 of 5'],
  [6, 'Stage 2 of 3: Your training. Question 1 of 5'],
  [9, 'Stage 2 of 3: Your training. Question 4 of 5'], // Schedule display position
  [10, 'Stage 2 of 3: Your training. Question 5 of 5'],
  [11, 'Stage 3 of 3: Make it yours. Question 1 of 3'],
  [13, 'Stage 3 of 3: Make it yours. Question 3 of 3'],
])('reports the correct stage when resuming at question %i', (step, label) => {
  const screen = render(<OnboardingProgress step={step} />);
  expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe(label);
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(step);
});
