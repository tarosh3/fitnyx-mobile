import React from 'react';
import { render } from '@testing-library/react-native';

import { HomeWeekSummary } from '../HomeProgress';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));

describe('HomeWeekSummary local calendar days', () => {
  afterEach(() => jest.useRealTimers());

  it('shows exactly seven local dates across a year boundary, including early-morning activity today', () => {
    jest.useFakeTimers();
    // In India this is still January 2 in UTC; the strip must show January 3.
    jest.setSystemTime(new Date(2026, 0, 3, 0, 30));
    const screen = render(
      <HomeWeekSummary
        activityDays={new Map([['2026-01-03', 2], ['2026-01-01', 1], ['2025-12-27', 3]])}
        weeklyWorkouts={3}
        weeklyVolume={1500}
        weeklyDuration={90}
        weeklyCalories={525}
        onViewActivity={jest.fn()}
      />,
    );

    expect(screen.getAllByTestId(/^home-activity-/)).toHaveLength(7);
    expect(screen.getByLabelText('Sunday, Dec 28, 0 workouts')).toBeTruthy();
    expect(screen.getByLabelText('Thursday, Jan 1, 1 workout')).toBeTruthy();
    expect(screen.getByLabelText('Saturday, Jan 3, 2 workouts, today')).toBeTruthy();
    expect(screen.queryByTestId('home-activity-2025-12-27')).toBeNull();
    expect(screen.queryByTestId('home-activity-2026-01-04')).toBeNull();
  });
});
