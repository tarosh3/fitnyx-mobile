import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedCount } from '../Motion';

it('keeps fractional distance accurate for assistive technology during the animation', () => {
  const screen = render(<AnimatedCount value={12.36} decimals={1} label="km" inline />);
  expect(screen.getByLabelText('12.4 km')).toBeOnTheScreen();
  screen.rerender(<AnimatedCount value={1.2} decimals={1} label="km" inline />);
  expect(screen.getByLabelText('1.2 km')).toBeOnTheScreen();
});

it('preserves the two-digit minutes in a duration display', () => {
  const screen = render(<AnimatedCount value={3} minDigits={2} label="m" inline />);
  expect(screen.getByLabelText('03 m')).toBeOnTheScreen();
});

it('groups large numbers and sanitizes missing data', () => {
  const screen = render(<AnimatedCount value={12000} label="Steps" />);
  expect(screen.getByLabelText('12,000 Steps')).toBeOnTheScreen();
  screen.rerender(<AnimatedCount value={NaN} label="Steps" />);
  expect(screen.getByLabelText('0 Steps')).toBeOnTheScreen();
});
