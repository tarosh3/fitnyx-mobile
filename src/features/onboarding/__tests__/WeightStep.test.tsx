import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return (props: object) => require('react').createElement(View, { testID: 'weight-slider', ...props });
});

// The scaffold's entrance animations need reanimated; the step's logic doesn't.
jest.mock('@/src/features/onboarding/steps/StepScaffold', () => {
  const { Pressable, Text, View } = require('react-native');
  const R = require('react');
  return {
    StepScaffold: ({ children, onContinue }: { children: React.ReactNode; onContinue: () => void }) =>
      R.createElement(View, null, children, R.createElement(Pressable, { onPress: onContinue }, R.createElement(Text, null, 'Continue'))),
  };
});

import { WeightStep } from '../steps/WeightStep';

function setup(weight = 70) {
  const onNext = jest.fn();
  const screen = render(
    <WeightStep data={{ weight_kg: weight } as never} onNext={onNext} onBack={jest.fn()} saving={false} />,
  );
  return { screen, onNext };
}

it('takes a weight to 2 decimals and drops the rest', () => {
  const { screen, onNext } = setup();
  fireEvent.changeText(screen.getByTestId('weight-input'), '72.456');
  expect(screen.getByTestId('weight-input').props.value).toBe('72.45');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ weight_kg: 72.45 });
});

it('converts a typed lbs weight to kg with 2 decimals', () => {
  const { screen, onNext } = setup();
  fireEvent.press(screen.getByText('lbs'));
  fireEvent.changeText(screen.getByTestId('weight-input'), '160.5');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ weight_kg: 72.8 });
});

it('rejects an empty or out-of-range weight', () => {
  const { screen, onNext } = setup();
  fireEvent.changeText(screen.getByTestId('weight-input'), '');
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.changeText(screen.getByTestId('weight-input'), '250');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).not.toHaveBeenCalled();
});
