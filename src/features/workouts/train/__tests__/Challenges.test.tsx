import React from 'react';
import { render } from '@testing-library/react-native';

import { Challenges } from '@/src/features/workouts/train/Challenges';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));

describe('challenge progress', () => {
  it('renders the retention metric as a percentage, not a fraction', () => {
    const screen = render(<Challenges monthWorkouts={3} streak={2} level={4} levelProgress={25} xpToNext={750} />);
    const level = screen.getByTestId('challenge-level-progress');
    expect(level.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });
    expect(level.props.children.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '25%' })]));
    expect(screen.getByTestId('challenge-month-progress').props.accessibilityValue.now).toBe(25);
  });

  it('keeps completed goals within their progress track', () => {
    const screen = render(<Challenges monthWorkouts={18} streak={9} level={4} levelProgress={0} xpToNext={1000} />);
    expect(screen.getByTestId('challenge-month-progress').props.accessibilityValue.now).toBe(100);
    expect(screen.getByTestId('challenge-streak-progress').props.accessibilityValue.now).toBe(100);
    expect(screen.getByTestId('challenge-level-progress').props.accessibilityValue.now).toBe(0);
  });
});
