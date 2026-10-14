import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockPause = jest.fn(async () => undefined);
const mockResume = jest.fn(async () => undefined);
const mockSetParams = jest.fn();
let mockParams: { notificationAction?: string; notificationState?: string } = {};
let mockSession = { id: 's1', status: 'paused', total_duration_sec: 0 };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams }),
}));
jest.mock('@/src/providers/WorkoutProvider', () => ({
  useWorkout: () => ({ activeSession: mockSession, pauseActiveSession: mockPause, resumeActiveSession: mockResume }),
}));
import { useNotificationWorkoutAction } from '../useNotificationWorkoutAction';

function Probe({ loaded = true }: { loaded?: boolean }) {
  useNotificationWorkoutAction('s1', loaded, jest.fn());
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSession = { id: 's1', status: 'paused', total_duration_sec: 0 };
});

it('does not start when the card is simply opened', () => {
  render(<Probe />);
  expect(mockResume).not.toHaveBeenCalled();
  expect(mockPause).not.toHaveBeenCalled();
});

it('waits for the logger to load before consuming an explicit Start link exactly once', async () => {
  mockParams = { notificationAction: 'resume', notificationState: 'ready' };
  const screen = render(<Probe loaded={false} />);
  expect(mockResume).not.toHaveBeenCalled();
  await act(async () => screen.rerender(<Probe />));
  screen.rerender(<Probe />);
  expect(mockResume).toHaveBeenCalledTimes(1);
  expect(mockSetParams).toHaveBeenCalledWith({ notificationAction: undefined, notificationState: undefined });
});

it('pauses only the running session targeted by the link', async () => {
  mockSession = { id: 's1', status: 'in_progress', total_duration_sec: 20 };
  mockParams = { notificationAction: 'pause', notificationState: 'running' };
  render(<Probe />);
  await act(async () => {});
  expect(mockPause).toHaveBeenCalledTimes(1);
  expect(mockResume).not.toHaveBeenCalled();
});

it.each(['another-session', 'stale-phase'])('discards %s actions without changing a workout', (scenario) => {
  mockParams = { notificationAction: 'resume', notificationState: 'ready' };
  if (scenario === 'another-session') mockSession.id = 's2';
  else mockSession.status = 'in_progress';
  render(<Probe />);
  expect(mockResume).not.toHaveBeenCalled();
  expect(mockPause).not.toHaveBeenCalled();
  expect(mockSetParams).toHaveBeenCalled();
});
