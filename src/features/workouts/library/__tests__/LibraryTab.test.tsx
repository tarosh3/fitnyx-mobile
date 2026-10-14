import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LibraryTab } from '@/src/features/workouts/library/LibraryTab';
import { fetchExercises } from '@/src/lib/api/exercises';
import { cacheClear } from '@/src/lib/cache';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/src/lib/api/exercises', () => ({ fetchExercises: jest.fn() }));

const mockFetch = fetchExercises as jest.MockedFunction<typeof fetchExercises>;

const row = (uuid: string, title: string) => ({
  uuid, title, primary_muscles: [{ name: 'Chest', image: '', description: '' }], equipment: [], tracking_type: 'weight_reps',
});

describe('exercise library', () => {
  beforeEach(async () => {
    await cacheClear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async ({ muscle }) => ({
      data: [row(`${muscle || 'all'}-1`, `${muscle || 'all'} move`)],
      meta: { current_page: 1, per_page: 30, total: 1, total_pages: 1 },
    }) as never);
  });

  it('asks for summary rows and warms every body-part chip once', async () => {
    render(<LibraryTab header={<></>} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8)); // All + 7 chips
    expect(mockFetch.mock.calls.every(([f]) => f.fields === 'summary')).toBe(true);
    expect(mockFetch.mock.calls.map(([f]) => f.muscle)).toEqual(['', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']);
  });

  it('shows a warmed chip from cache without waiting for the network', async () => {
    const screen = render(<LibraryTab header={<></>} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8));
    mockFetch.mockImplementation(() => new Promise(() => undefined)); // network never answers
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('back move')).toBeTruthy();
  });

  it('drops the previous chip’s rows when the next one has no cache', async () => {
    mockFetch.mockImplementationOnce(async () => ({
      data: [row('all-1', 'all move')], meta: { current_page: 1, per_page: 30, total: 1, total_pages: 1 },
    }) as never);
    mockFetch.mockImplementation(() => new Promise(() => undefined)); // prefetch + chip fetch hang
    const screen = render(<LibraryTab header={<></>} />);
    expect(await screen.findByText('all move')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Legs' }));
    await waitFor(() => expect(screen.queryByText('all move')).toBeNull());
  });
});
