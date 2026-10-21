import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));

import { GritCard } from '../summary/GritCard';

const breakdown = { sets: 6, hard_sets: 2, prs: 1, routine: true, streak: false, too_short: false, capped: false, grit: 125 };

it('shows the total and what earned it', () => {
  render(<GritCard session={{ grit: 125, grit_breakdown: breakdown }} />);
  expect(screen.getByText('+125')).toBeOnTheScreen();
  expect(screen.getByText('6 sets done')).toBeOnTheScreen();
  expect(screen.getByText('+60')).toBeOnTheScreen();
  expect(screen.getByText('1 new personal best')).toBeOnTheScreen();
});

it('explains a workout that was too short', () => {
  render(<GritCard session={{ grit: 0, grit_breakdown: { ...breakdown, sets: 0, hard_sets: 0, prs: 0, routine: false, too_short: true, grit: 0 } }} />);
  expect(screen.getByText('+0')).toBeOnTheScreen();
  expect(screen.getByText(/under 10 minutes/)).toBeOnTheScreen();
});

it('renders nothing before the workout is scored', () => {
  render(<GritCard session={{ grit: null, grit_breakdown: null }} />);
  expect(screen.queryByTestId('grit-card')).not.toBeOnTheScreen();
});
