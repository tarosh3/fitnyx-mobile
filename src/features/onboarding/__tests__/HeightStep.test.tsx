import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

jest.mock('@/src/features/onboarding/steps/StepScaffold', () => {
  const { Pressable, Text, View } = require('react-native');
  const R = require('react');
  return {
    StepScaffold: ({ children, onContinue }: { children: React.ReactNode; onContinue: () => void }) =>
      R.createElement(View, null, children, R.createElement(Pressable, { onPress: onContinue }, R.createElement(Text, null, 'Continue'))),
  };
});

import { HeightStep } from '../steps/HeightStep';

// A full scroll event: VirtualizedList reads the viewport and content sizes.
const scrollAt = (x: number) => ({
  nativeEvent: { contentOffset: { x, y: 0 }, layoutMeasurement: { width: 300, height: 76 }, contentSize: { width: 20000, height: 76 } },
});

function setup(height = 170) {
  const onNext = jest.fn();
  const screen = render(
    <HeightStep data={{ height_cm: height } as never} onNext={onNext} onBack={jest.fn()} saving={false} />,
  );
  return { screen, onNext };
}

it('takes a typed height in cm', () => {
  const { screen, onNext } = setup();
  fireEvent.changeText(screen.getByTestId('height-input'), '182');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ height_cm: 182 });
});

it('rejects an empty or out-of-range height', () => {
  const { screen, onNext } = setup();
  fireEvent.changeText(screen.getByTestId('height-input'), '');
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.changeText(screen.getByTestId('height-input'), '90');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).not.toHaveBeenCalled();
});

it('edits feet / inches by the inch and saves cm', () => {
  const { screen, onNext } = setup(175); // 68.9 in → 5'9"
  fireEvent.press(screen.getByText('ft / in'));
  expect(screen.getByTestId('height-value')).toHaveTextContent('5\'9"');
  fireEvent.press(screen.getByLabelText('Increase by 1 inch'));
  expect(screen.getByTestId('height-value')).toHaveTextContent('5\'10"');
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ height_cm: 178 });
});

it('picks a height by sliding the ruler', () => {
  const { screen, onNext } = setup();
  fireEvent(screen.getByLabelText('Height ruler'), 'layout', { nativeEvent: { layout: { width: 300 } } });
  const list = screen.getByTestId('ruler-list');
  fireEvent(list, 'scrollBeginDrag');
  fireEvent.scroll(list, scrollAt(650)); // tick 65 from 100 cm
  fireEvent.press(screen.getByText('Continue'));
  expect(onNext).toHaveBeenCalledWith({ height_cm: 165 });
});
