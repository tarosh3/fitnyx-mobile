import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { DashboardPlan, DashboardPlanDay } from '@/src/lib/api/dashboard';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { ActiveMissionCard } from '../ActiveMissionCard';

const mockPush = jest.fn();
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
  it('points a new user to the plan built from their answers, without inventing workout metrics', () => {
    render(<ActiveMissionCard activePlan={null} activeSession={null} currentDay={null} nextExercisesCount={0} currentDayIndex={1} totalDays={0} />);
    expect(screen.getByText('Your plan\nis ready.')).toBeTruthy();
    expect(screen.getByText('See your plan')).toBeTruthy();
    expect(screen.queryByText(/exercises/)).toBeNull();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledWith('/plan');
  });

  it('labels plan navigation accurately and shows the supplied workout details', () => {
    render(<ActiveMissionCard activePlan={plan} activeSession={null} currentDay={day} currentDayIndex={2} totalDays={4} />);
    expect(screen.getByText('UP NEXT')).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
    expect(screen.getByText('Build strength')).toBeTruthy();
    expect(screen.getByText('5 exercises  ·  Day 2 of 4')).toBeTruthy();
    expect(screen.getByText('View workout')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-workout-card'));
    expect(mockPush).toHaveBeenCalledWith('/workouts/programs/plan-1');
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
