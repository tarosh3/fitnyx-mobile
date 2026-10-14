import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { startWorkout } from '@/src/features/workouts/start';
import { TrainHero } from '@/src/features/workouts/train/TrainHero';
import type { Routine } from '@/src/lib/api/routines';

const mockPush = jest.fn();
const mockSetSession = jest.fn();
let mockSession: { id: string; status: string; total_duration_sec: number } | null = null;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/providers/WorkoutProvider', () => ({
  useWorkout: () => ({ activeSession: mockSession, setActiveSession: mockSetSession }),
  useWorkoutTimer: () => ({ elapsedTime: 120 }),
}));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
jest.mock('@/src/features/workouts/start', () => ({
  isReady: (session: { status: string; total_duration_sec: number }) => session.status === 'paused' && session.total_duration_sec === 0,
  startWorkout: jest.fn(() => Promise.resolve()),
}));

const program = { planId: 'program-1', dayId: 'day-2', title: 'Strength', dayName: 'Upper body', exercises: 4 };
const defaults = { routines: [], trainedToday: false, program: null, firstVisit: false, onError: jest.fn() };

beforeEach(() => { jest.clearAllMocks(); mockSession = null; });

it('prioritizes the open session and resumes it without creating another', () => {
  mockSession = { id: 'open-session', status: 'paused', total_duration_sec: 0 };
  const screen = render(<TrainHero {...defaults} firstVisit trainedToday program={program} />);
  expect(screen.getByText('Timer not started yet')).toBeTruthy();
  fireEvent.press(screen.getByTestId('hero-resume'));
  expect(mockPush).toHaveBeenCalledWith('/workouts/session/open-session');
  expect(startWorkout).not.toHaveBeenCalled();
});

it('starts the exact program day shown in the hero', async () => {
  const screen = render(<TrainHero {...defaults} program={program} />);
  fireEvent.press(screen.getByTestId('hero-start-program'));
  await waitFor(() => expect(startWorkout).toHaveBeenCalledWith(
    { planId: 'program-1', dayId: 'day-2' }, expect.objectContaining({ setActiveSession: mockSetSession }),
  ));
});

it('suggests the least recently trained routine and preserves its day ID', async () => {
  const routine = (id: string, last_done: string | null): Routine => ({ id, day_id: `${id}-day`, title: id, last_done, created_at: '', updated_at: '', exercises: [] });
  const screen = render(<TrainHero {...defaults} routines={[routine('recent', '2026-10-13'), routine('untried', null)]} />);
  fireEvent.press(screen.getByTestId('hero-start-routine'));
  await waitFor(() => expect(startWorkout).toHaveBeenCalledWith(
    { planId: 'untried', dayId: 'untried-day' }, expect.objectContaining({ setActiveSession: mockSetSession }),
  ));
});
