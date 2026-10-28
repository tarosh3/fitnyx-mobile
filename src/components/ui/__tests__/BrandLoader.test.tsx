import React from 'react';
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { BrandLoader } from '../BrandLoader';

const mockPlay = jest.fn();
const mockPause = jest.fn();
jest.mock('lottie-react-native', () => {
  const R = require('react');
  const { View } = require('react-native');
  return R.forwardRef((props: object, ref: unknown) => {
    R.useImperativeHandle(ref, () => ({ play: mockPlay, pause: mockPause }));
    return <View testID="lottie" {...props} />;
  });
});
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

it('announces loading and switches to static art when reduced motion is enabled', () => {
  const remove = jest.fn();
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
  const screen = render(<BrandLoader accessibilityLabel="Loading workouts" />);
  expect(screen.getByRole('progressbar')).toHaveProp('accessibilityLabel', 'Loading workouts');
  expect(screen.getByTestId('lottie')).toBeTruthy();
  const change = subscribe.mock.calls.find(([event]) => String(event) === 'reduceMotionChanged')?.[1] as unknown as (enabled: boolean) => void;
  act(() => change(true));
  expect(screen.queryByTestId('lottie')).toBeNull();
  expect(screen.getByRole('progressbar')).toBeTruthy();
  screen.unmount();
  expect(remove).toHaveBeenCalled();
});

it('pauses in the background and resumes in the foreground', () => {
  let change: (state: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    change = handler; return { remove };
  });
  const screen = render(<BrandLoader />);
  act(() => change('background'));
  expect(mockPause).toHaveBeenCalled();
  act(() => change('active'));
  expect(mockPlay).toHaveBeenCalled();
  screen.unmount();
  expect(remove).toHaveBeenCalled();
});

it('does not render when the operation is no longer loading', () => {
  const screen = render(<BrandLoader animating={false} />);
  expect(screen.queryByRole('progressbar')).toBeNull();
});
