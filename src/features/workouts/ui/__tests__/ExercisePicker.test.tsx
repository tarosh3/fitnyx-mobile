import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ExercisePicker } from '@/src/features/workouts/ui/ExercisePicker';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/features/workouts/ui/ExerciseThumb', () => ({ ExerciseThumb: () => null }));
jest.mock('@/src/features/workouts/ui/ExercisePreview', () => ({
  ExercisePreview: ({ exercise }: { exercise: { title: string } }) => {
    const { Text } = require('react-native');
    return require('react').createElement(Text, { testID: 'exercise-preview' }, `Watching ${exercise.title}`);
  },
}));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const mockFetch = jest.fn(async (..._a: unknown[]) => ({ data: [], meta: { total: 0 } }));
jest.mock('@/src/lib/api/exercises', () => ({
  ...jest.requireActual('@/src/lib/api/exercises'),
  fetchExercises: (...a: unknown[]) => mockFetch(...a),
  fetchExerciseUsage: () => Promise.resolve([]),
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

describe('ExercisePicker — find an exercise by body part, muscle and equipment', () => {
  beforeEach(() => mockFetch.mockClear());
  const lastCall = () => mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as Record<string, unknown>;

  it('narrows by muscle within a body part, then by equipment', async () => {
    render(<ExercisePicker {...props} onConfirm={jest.fn()} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.queryByTestId('finder-muscles')).toBeNull();

    fireEvent.press(screen.getByLabelText('Body part: Legs'));
    await waitFor(() => expect(lastCall()).toMatchObject({ muscle: 'legs' }));
    fireEvent.press(screen.getByLabelText('Muscle: Quads'));
    await waitFor(() => expect(lastCall()).toMatchObject({ muscle: 'Quads' }));
    fireEvent.press(screen.getByLabelText('Equipment: Barbell'));
    await waitFor(() => expect(lastCall()).toMatchObject({ muscle: 'Quads', equipment: 'barbell' }));

    // A new body part clears the muscle but keeps the equipment.
    fireEvent.press(screen.getByLabelText('Body part: Back'));
    await waitFor(() => expect(lastCall()).toMatchObject({ muscle: 'back', equipment: 'barbell' }));
  });

  it('plays an exercise from its thumbnail without picking it', async () => {
    mockFetch.mockResolvedValueOnce({
      data: [{ uuid: 'sq', title: 'Front Squat', video_url: 'https://res.cloudinary.com/x/video/upload/v1/a.mp4', primary_muscles: [{ name: 'Quads', image: '', description: '' }], equipment: [{ name: 'Barbell', description: '' }] }],
      meta: { total: 1 },
    } as never);
    render(<ExercisePicker {...props} onConfirm={jest.fn()} />);
    expect(await screen.findByText('Quads · Barbell')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('preview-sq'));
    expect(screen.getByText('Watching Front Squat')).toBeOnTheScreen();
    expect(screen.getByText('Pick one')).toBeOnTheScreen(); // still nothing picked
  });
});
