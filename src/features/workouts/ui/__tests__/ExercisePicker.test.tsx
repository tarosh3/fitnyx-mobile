import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/features/workouts/ui/ExerciseThumb', () => ({ ExerciseThumb: () => null }));
const mockFetch = jest.fn(async (..._a: unknown[]) => ({ data: [], meta: { total: 0 } }));
jest.mock('@/src/lib/api/exercises', () => ({
  ...jest.requireActual('@/src/lib/api/exercises'),
  fetchExercises: (...a: unknown[]) => mockFetch(...a),
}));
const mockCreate = jest.fn();
jest.mock('@/src/lib/offline/customExercises', () => ({ offlineCreateExercise: (...a: unknown[]) => mockCreate(...a) }));

const props = { visible: true, onClose: jest.fn(), mode: 'single' as const, title: 'Add exercise', confirmLabel: () => 'Next', emptyLabel: 'Pick one' };

describe('ExercisePicker — create your own', () => {
  beforeEach(() => mockCreate.mockReset());

  it('creates the searched name and picks it', async () => {
    const onConfirm = jest.fn();
    render(<ExercisePicker {...props} onConfirm={onConfirm} />);
    fireEvent.changeText(screen.getByLabelText('Search exercises'), 'Landmine press');
    await waitFor(() => expect(screen.getByText('Can’t find it? Create “Landmine press”')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('picker-create'));

    expect(screen.getByTestId('custom-name').props.value).toBe('Landmine press');
    fireEvent.press(screen.getByText('Reps only'));
    fireEvent.press(screen.getByText('Shoulders'));
    mockCreate.mockResolvedValue({ uuid: 'u-1', title: 'Landmine press', tracking_type: 'reps', primary_muscles: [], equipment: [] });
    fireEvent.press(screen.getByTestId('custom-create'));

    await waitFor(() => expect(screen.getByText('Next')).toBeOnTheScreen());
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ title: 'Landmine press', tracking_type: 'reps', primary_muscle: 'Shoulders', suggest: true });
    fireEvent.press(screen.getByTestId('picker-confirm'));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ uuid: 'u-1' })]);
  });

  it('shows the server’s reason inside the sheet', async () => {
    render(<ExercisePicker {...props} onConfirm={jest.fn()} />);
    fireEvent.press(screen.getByTestId('picker-create'));
    fireEvent.changeText(screen.getByTestId('custom-name'), 'Sled push');
    mockCreate.mockRejectedValue(Object.assign(new Error('You can have up to 10 custom exercises. Remove one first.'), { status: 409 }));
    fireEvent.press(screen.getByTestId('custom-create'));
    await waitFor(() => expect(screen.getByText('You can have up to 10 custom exercises. Remove one first.')).toBeOnTheScreen());
  });
});
