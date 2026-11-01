import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

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

// A full scroll event: VirtualizedList reads the viewport and content sizes.
const scrollAt = (x: number) => ({
  nativeEvent: { contentOffset: { x, y: 0 }, layoutMeasurement: { width: 300, height: 76 }, contentSize: { width: 20000, height: 76 } },
});

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

it('steps by 0.1 kg with − / +', () => {
  const { screen, onNext } = setup(72.4);
  fireEvent.press(screen.getByLabelText('Increase by 0.1 kg'));
  fireEvent.press(screen.getByLabelText('Increase by 0.1 kg'));
  fireEvent.press(screen.getByLabelText('Decrease by 0.1 kg'));
  expect(screen.getByTestId('weight-input').props.value).toBe('72.5');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ weight_kg: 72.5 });
});

it('picks a decimal weight by sliding the ruler', () => {
  const { screen, onNext } = setup(70);
  fireEvent(screen.getByLabelText('Weight ruler'), 'layout', { nativeEvent: { layout: { width: 300 } } });
  const list = screen.getByTestId('ruler-list');
  fireEvent(list, 'scrollBeginDrag');
  // 10 px per 0.1 kg tick from 30 kg: tick 427 = 72.7 kg.
  fireEvent.scroll(list, scrollAt(4270));
  expect(screen.getByTestId('weight-input').props.value).toBe('72.7');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ weight_kg: 72.7 });
});

it('ignores scrolls it makes itself (a typed value is not snapped)', () => {
  const { screen, onNext } = setup(70);
  fireEvent(screen.getByLabelText('Weight ruler'), 'layout', { nativeEvent: { layout: { width: 300 } } });
  fireEvent.changeText(screen.getByTestId('weight-input'), '72.45');
  fireEvent.scroll(screen.getByTestId('ruler-list'), scrollAt(4250));
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ weight_kg: 72.45 });
});
