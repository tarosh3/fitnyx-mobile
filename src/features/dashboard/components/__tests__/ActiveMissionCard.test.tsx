import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { DashboardPlan, DashboardPlanDay } from '@/src/lib/api/dashboard';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { ActiveMissionCard } from '../ActiveMissionCard';

const mockPush = jest.fn();
const mockSetActiveSession = jest.fn();
const mockStart = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
jest.mock('@/src/providers/WorkoutProvider', () => ({ useWorkout: () => ({ setActiveSession: mockSetActiveSession }) }));
jest.mock('@/src/features/workouts/start', () => ({ startWorkout: (...args: unknown[]) => mockStart(...args) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const plan: DashboardPlan = { id: 'plan-1', title: 'Build strength' };
const day: DashboardPlanDay = { id: 'day-1', day_index: 2, day_name: 'Push day', exercise_count: 5 };
const session: WorkoutSession = {
  id: 'session-1', user_id: 'user-1', plan_id: plan.id, day_id: day.id,
  workout_date: '2026-10-12', started_at: '2026-10-12T08:00:00Z',
  status: 'in_progress', total_duration_sec: 0, created_at: '2026-10-12T08:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

describe('ActiveMissionCard', () => {
  it('starts an empty workout and keeps starter-plan discovery available', async () => {
    render(<ActiveMissionCard activePlan={null} activeSession={null} currentDay={null} nextExercisesCount={0} currentDayIndex={1} totalDays={0} />);
    expect(screen.getByText('Ready to move?')).toBeTruthy();
    expect(screen.getByText('Start workout')).toBeTruthy();
    expect(screen.queryByText(/exercises/)).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('home-workout-card')));
    expect(mockStart).toHaveBeenCalledWith({ planId: undefined, dayId: undefined }, { router: expect.anything(), setActiveSession: mockSetActiveSession });
    fireEvent.press(screen.getByText('See your starter plan'));
    expect(mockPush).toHaveBeenCalledWith('/plan');
  });

  it('starts the supplied plan day directly from Home', async () => {
    render(<ActiveMissionCard activePlan={plan} activeSession={null} currentDay={day} currentDayIndex={2} totalDays={4} />);
    expect(screen.getByText('UP NEXT')).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
    expect(screen.getByText('Build strength')).toBeTruthy();
    expect(screen.getByText('5 exercises  ·  Day 2 of 4')).toBeTruthy();
    expect(screen.getByText('Start workout')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('home-workout-card')));
    expect(mockStart).toHaveBeenCalledWith({ planId: plan.id, dayId: day.id }, { router: expect.anything(), setActiveSession: mockSetActiveSession });
  });

  it('shows recoverable start failures and permits retry', async () => {
    mockStart.mockRejectedValueOnce(new Error('offline'));
    render(<ActiveMissionCard activePlan={plan} activeSession={null} currentDay={day} />);
    await act(async () => fireEvent.press(screen.getByTestId('home-workout-card')));
    expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('home-workout-card')));
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables starting while a request is pending', async () => {
    let finish!: () => void;
    mockStart.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<ActiveMissionCard activePlan={plan} activeSession={null} currentDay={day} />);
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(screen.getByTestId('home-workout-card')).toHaveProp('accessibilityState', { busy: true, disabled: true });
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('prioritizes an active session over the active plan', () => {
    render(<ActiveMissionCard activePlan={plan} activeSession={session} currentDay={day} />);
    expect(screen.getByText('SESSION IN PROGRESS')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue workout. Push day. 5 exercises' })).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/workouts/session/session-1');
  });

  it('falls back to the plan name when current day information is unavailable', () => {
    render(<ActiveMissionCard activePlan={plan} activeSession={null} currentDay={null} nextExercisesCount={0} currentDayIndex={1} totalDays={4} />);
    expect(screen.getAllByText('Build strength')).toHaveLength(1);
    expect(screen.getByText('Your next session, all laid out.')).toBeTruthy();
    expect(screen.queryByText(/Day \d/)).toBeNull();
    expect(screen.queryByText(/exercises/)).toBeNull();
  });

  it('keeps an orphaned active session reachable and omits invalid day progress', () => {
    render(<ActiveMissionCard activePlan={null} activeSession={session} currentDay={null} nextExercisesCount={1} currentDayIndex={8} totalDays={4} />);
    expect(screen.getByText('Your workout')).toBeTruthy();
    expect(screen.queryByText(/exercise/)).toBeNull();
    expect(screen.queryByText(/Day 8/)).toBeNull();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledWith('/workouts/session/session-1');
  });

  it('does not label a resumed session with another active plan’s upcoming workout', () => {
    render(<ActiveMissionCard
      activePlan={plan}
      activeSession={{ ...session, plan_id: 'older-plan', day_id: 'older-day' }}
      currentDay={day}
      nextExercisesCount={5}
      currentDayIndex={2}
      totalDays={4}
    />);

    expect(screen.getByRole('button', { name: 'Continue workout. Your workout' })).toBeTruthy();
    expect(screen.queryByText('Push day')).toBeNull();
    expect(screen.queryByText('Build strength')).toBeNull();
    expect(screen.queryByText(/exercises|Day 2/)).toBeNull();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledWith('/workouts/session/session-1');
  });

  it('keeps a matching plan name but omits details for a different day being resumed', () => {
    render(<ActiveMissionCard
      activePlan={plan}
      activeSession={{ ...session, day_id: 'another-day' }}
      currentDay={day}
      nextExercisesCount={5}
      currentDayIndex={2}
      totalDays={4}
    />);

    expect(screen.getByRole('button', { name: 'Continue workout. Build strength' })).toBeTruthy();
    expect(screen.queryByText('Push day')).toBeNull();
    expect(screen.queryByText(/exercises|Day 2/)).toBeNull();
  });

  it('says so when today’s plan day has no exercises', () => {
    render(
      <ActiveMissionCard
        activePlan={plan}
        activeSession={null}
        currentDay={{ ...day, exercise_count: 0 }}
        nextExercisesCount={0}
        currentDayIndex={2}
        totalDays={3}
      />,
    );
    expect(screen.getByText('No exercises on this day yet. Add some to your plan.')).toBeTruthy();
    expect(screen.getByText('Open plan')).toBeTruthy();
    expect(screen.queryByText(/0 exercises/)).toBeNull();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledWith('/workouts/programs/plan-1');
  });
});

// Navigation/data tests don't require the native worklet runtime.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: 'system' },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: (style: () => unknown) => style(),
  withTiming: (value: number) => value,
}));

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
