import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { FinishSheet } from '@/src/features/workouts/logger/FinishSheet';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const props = { visible: true, setsLeft: 0, routineTitle: null, extras: [], busy: false, onFinish: jest.fn(), onClose: jest.fn() };

describe('FinishSheet discard', () => {
  it('asks before discarding a workout with logged sets', () => {
    const onDiscard = jest.fn();
    const screen = render(<FinishSheet {...props} setsDone={4} onDiscard={onDiscard} />);
    fireEvent.press(screen.getByTestId('discard'));
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.getByText('Discard this workout?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('discard-confirm'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('goes back to the finish options from the confirmation', () => {
    const screen = render(<FinishSheet {...props} setsDone={4} onDiscard={jest.fn()} />);
    fireEvent.press(screen.getByTestId('discard'));
    fireEvent.press(screen.getByText('Keep it'));
    expect(screen.getByText('Finish workout?')).toBeOnTheScreen();
  });

  it('discards an empty workout in one tap', () => {
    const onDiscard = jest.fn();
    const screen = render(<FinishSheet {...props} setsDone={0} onDiscard={onDiscard} />);
    fireEvent.press(screen.getByTestId('discard'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
