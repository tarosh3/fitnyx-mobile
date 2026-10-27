import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LibraryTab } from '@/src/features/workouts/library/LibraryTab';
import { getCatalog, syncCatalog } from '@/src/lib/offline/catalogCache';
import { cacheClear } from '@/src/lib/cache';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/src/lib/api/exercises', () => ({ fetchExercises: jest.fn() }));
jest.mock('@/src/lib/offline/catalogCache', () => ({ getCatalog: jest.fn(), syncCatalog: jest.fn() }));

const ex = (title: string, muscle: string, equipment: string[] = []) => ({
  uuid: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  primary_muscles: [{ name: muscle, image: '', description: '' }],
  secondary_muscles: [],
  equipment: equipment.map((name) => ({ name, description: '' })),
  tracking_type: 'weight_reps',
});

const CATALOG = [
  ex('Barbell Bench Press', 'Lower Chest', ['Barbell']),
  ex('Barbell Back Squat', 'Quads', ['Barbell']),
  ex('Lat Pulldown', 'Lats', ['Machine']),
];

const mockGet = getCatalog as jest.MockedFunction<typeof getCatalog>;
const mockSync = syncCatalog as jest.MockedFunction<typeof syncCatalog>;

describe('exercise library (catalog-driven local search)', () => {
  beforeEach(async () => {
    await cacheClear();
    mockGet.mockReset().mockResolvedValue(CATALOG as never);
    mockSync.mockReset().mockResolvedValue(CATALOG as never);
  });

  it('shows the whole cached catalog without a per-query network call', async () => {
    const screen = render(<LibraryTab header={<></>} />);
    expect(await screen.findByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Lat Pulldown')).toBeTruthy();
  });

  it('searches locally by title', async () => {
    const screen = render(<LibraryTab header={<></>} />);
    await screen.findByText('Barbell Bench Press');
    fireEvent.changeText(screen.getByLabelText('Search exercises'), 'squat');
    expect(await screen.findByText('Barbell Back Squat')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Lat Pulldown')).not.toBeOnTheScreen());
  });

  it('tolerates typos', async () => {
    const screen = render(<LibraryTab header={<></>} />);
    await screen.findByText('Barbell Bench Press');
    fireEvent.changeText(screen.getByLabelText('Search exercises'), 'benh');
    expect(await screen.findByText('Barbell Bench Press')).toBeTruthy();
  });

  it('filters by body-part chip locally', async () => {
    const screen = render(<LibraryTab header={<></>} />);
    await screen.findByText('Barbell Bench Press');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Lat Pulldown')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Barbell Bench Press')).not.toBeOnTheScreen());
  });
});
