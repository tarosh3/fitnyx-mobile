import React from 'react';
import { render } from '@testing-library/react-native';

import { DietPlanView } from '@/src/features/diet/DietPlanView';

// MacroDonut pulls in reanimated, whose jest mock fails to load here.
jest.mock('@/src/features/diet/MacroDonut', () => ({ MacroDonut: () => null }));
jest.mock('@/src/lib/api', () => ({}));
jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const basePlan = (plan_data: any) => ({
  id: 'p1',
  user_id: 'u1',
  plan_data,
  preferences: {},
  created_at: '2026-10-08T00:00:00Z',
});

describe('DietPlanView with malformed AI output', () => {
  it('renders when macros are numbers and meal fields are missing', () => {
    const plan = basePlan({
      total_calories: 2000,
      macros: { protein: 150, carbs: 200 },
      meals: [{ calories: 400 }],
    });
    expect(() =>
      render(<DietPlanView plan={plan as any} onRegenerate={jest.fn()} onEditPreferences={jest.fn()} isLoading={false} />),
    ).not.toThrow();
  });

  it('renders when macros and meals are absent', () => {
    const plan = basePlan({ total_calories: 2000 });
    expect(() =>
      render(<DietPlanView plan={plan as any} onRegenerate={jest.fn()} onEditPreferences={jest.fn()} isLoading={false} />),
    ).not.toThrow();
  });
});
