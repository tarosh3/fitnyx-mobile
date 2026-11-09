import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { applyTargets, formatChange, phaseKindFor, phaseLabel, targetLine, weekStrip } from '@/src/features/program/model';
import type { DayTargets, Program, ProgramCheckin } from '@/src/lib/api/programs';
import type { WorkoutDayExercise } from '@/src/lib/api/workoutPlans';

const mockPush = jest.fn();
const mockStart = jest.fn(async () => {});
let mockProgram: Program | null = null;
let mockSeen = -1;
const mockMarkSeen = jest.fn();
let mockTargets: DayTargets | null = null;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/features/appConfig/store', () => ({ useFeatureFlag: () => true }));
let mockPro = true;
jest.mock('@/src/features/pro/store', () => ({ useEntitlement: () => ({ isPro: mockPro, loaded: true, entitlement: null }) }));
jest.mock('@/src/features/plan/data', () => ({ usePlan: () => ({ data: { schedule: { days_per_week: 4, session_min: 50 } } }) }));
jest.mock('@/src/providers/WorkoutProvider', () => ({ useWorkout: () => ({ activeSession: null, setActiveSession: jest.fn() }) }));
jest.mock('@/src/features/workouts/start', () => ({ startWorkout: (...a: unknown[]) => mockStart(...(a as [])) }));
jest.mock('@/src/features/workouts/ui/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/src/components/ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/src/components/ui/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('@/src/features/program/data', () => ({
  useActiveProgram: () => ({ data: mockProgram, loading: false, setData: jest.fn() }),
  useCheckinSeen: () => ({ seen: mockSeen, markSeen: mockMarkSeen }),
  useDayTargets: () => ({ data: mockTargets, loading: false }),
  useBuildProgram: () => ({ build: jest.fn(), busy: false }),
}));

const checkin: ProgramCheckin = {
  calendar_week: 1, week: 2, advanced: true, next_week: 3, weeks: 8, finished: false, planned: 3, done: 3,
  up: [{ exercise_uuid: 'bench', title: 'Bench Press', from: 80, to: 83.3, unit: 'kg' }], stalled: [],
  swaps: [{ from_uuid: 'row', from_title: 'Row', to_uuid: 'inc', to_title: 'Incline Row' }],
  next_phase: { kind: 'build', extra_set: true }, note: 'All three done and your bench went up. Next week adds a set.', created_at: '',
};

const program = (over: Partial<Program> = {}): Program => ({
  id: 'p1', title: '8-Week Program · Full Body', description: '', weeks: 8, week: 3, start_date: '2026-10-26',
  phase: { kind: 'build', extra_set: true }, planned: 3, done: 1, next_day_id: 'd2', checkin_due: false, finished: false,
  last_checkin: checkin, gains: [],
  days: [
    { id: 'd1', title: 'Full Body A', day_index: 1, exercises: 6, done_this_week: true },
    { id: 'd2', title: 'Full Body B', day_index: 2, exercises: 6, done_this_week: false },
    { id: 'd3', title: 'Full Body C', day_index: 3, exercises: 5, done_this_week: false },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPro = true;
  mockProgram = null;
  mockSeen = -1;
  mockTargets = null;
});

describe('model', () => {
  it('phases match the backend: every 4th week lighter, the last a test week', () => {
    expect(Array.from({ length: 12 }, (_, i) => phaseKindFor(i + 1, 12)).join(' '))
      .toBe('build build build deload build build build deload build build build test');
    expect(phaseKindFor(4, 4)).toBe('test');
    expect(phaseLabel({ kind: 'build', extra_set: true })).toBe('Building · extra set');
    expect(phaseLabel({ kind: 'deload', extra_set: false })).toBe('Lighter week');
  });

  it('weekStrip marks done, now and next', () => {
    expect(weekStrip(4, 2, false).map((w) => w.state)).toEqual(['done', 'now', 'next', 'next']);
    expect(weekStrip(4, 4, true).every((w) => w.state === 'done')).toBe(true);
  });

  it("applyTargets puts today's targets on the rows, assistance in target_weight_kg", () => {
    const rows = [
      { id: 'r1', exercise_uuid: 'bench', target_sets: 3, target_reps: 10, exercise: { tracking_type: 'weight_reps' } },
      { id: 'r2', exercise_uuid: 'pullup', target_sets: 3, target_reps: 8, exercise: { tracking_type: 'assisted_reps' } },
      { id: 'r3', exercise_uuid: 'plank', target_sets: 3, target_duration_sec: 30 },
      { id: 'r4', exercise_uuid: 'new', target_sets: 3 },
    ] as unknown as WorkoutDayExercise[];
    const t: DayTargets = { day_id: 'd', week: 4, phase: { kind: 'deload', extra_set: false }, items: [
      { day_exercise_id: 'r1', exercise_uuid: 'bench', title: '', tracking_type: '', part: 'chest', sets: 2, reps: 10, weight_kg: 55, kind: 'light', note: '' },
      { day_exercise_id: 'r2', exercise_uuid: 'pullup', title: '', tracking_type: '', part: 'back', sets: 2, reps: 8, assist_kg: 20, kind: 'light', note: '' },
      { day_exercise_id: 'r3', exercise_uuid: 'plank', title: '', tracking_type: '', part: 'core', sets: 2, duration_sec: 45, kind: 'reps', note: '' },
      { day_exercise_id: 'r4', exercise_uuid: 'swapped-since', title: '', tracking_type: '', part: 'x', sets: 5, kind: 'first', note: '' },
    ] };
    const out = applyTargets(rows, t);
    expect(out[0]).toMatchObject({ target_sets: 2, target_reps: 10, target_weight_kg: 55 });
    expect(out[1]).toMatchObject({ target_sets: 2, target_weight_kg: 20 });
    expect(out[2]).toMatchObject({ target_sets: 2, target_duration_sec: 45 });
    expect(out[3]).toBe(rows[3]); // a row swapped since the targets were worked out keeps its own
    expect(applyTargets(rows, null)).toBe(rows);
  });

  it('formats changes and targets', () => {
    expect(formatChange({ exercise_uuid: '', title: '', from: 30, to: 36.7, unit: 'kg' })).toBe('+22%');
    expect(formatChange({ exercise_uuid: '', title: '', from: 12, to: 15, unit: 'reps' })).toBe('+25%');
    expect(formatChange({ exercise_uuid: '', title: '', from: 100, to: 100.2, unit: 's' })).toBe('+1%');
    expect(formatChange({ exercise_uuid: '', title: '', from: 1, to: 2, unit: '' })).toBeNull();
    expect(targetLine({ sets: 3, reps: 8, weight_kg: 62.5 })).toBe('3 × 8 · 62.5 kg');
    expect(targetLine({ sets: 3, reps: 8, assist_kg: 20 })).toBe('3 × 8 · 20 kg help');
    expect(targetLine({ sets: 3, reps: 12 })).toBe('3 × 12');
    expect(targetLine({ sets: 2, duration_sec: 45 })).toBe('2 × 45 s');
    expect(targetLine({ sets: 1, duration_sec: 600 })).toBe('10:00');
  });
});

describe('AdaptiveProgramCard', () => {
  const { AdaptiveProgramCard } = require('@/src/features/program/AdaptiveProgramCard');

  it('offers to build a program when there is none, and stays hidden on Home', () => {
    const { rerender } = render(<AdaptiveProgramCard />);
    expect(screen.getByText('A program that adapts to you')).toBeOnTheScreen();
    expect(screen.getByText('Build my program')).toBeOnTheScreen();
    rerender(<AdaptiveProgramCard pitch={false} />);
    expect(screen.queryByTestId('program-pitch')).toBeNull();
  });

  it('shows the week and opens the program', () => {
    mockProgram = program();
    mockSeen = 1;
    render(<AdaptiveProgramCard />);
    expect(screen.getByText('WEEK 3 OF 8 · BUILDING · EXTRA SET')).toBeOnTheScreen();
    expect(screen.getByText('1 of 3 workouts this week')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('program-card'));
    expect(mockPush).toHaveBeenCalledWith('/program');
  });

  it('flags a review the user has not opened', () => {
    mockProgram = program();
    mockSeen = 0;
    render(<AdaptiveProgramCard />);
    expect(screen.getByText('Your week in review is ready')).toBeOnTheScreen();
  });
});

describe('ProgramScreen', () => {
  const { ProgramScreen } = require('@/src/features/program/ProgramScreen');

  it("shows the block, the next workout with today's targets, and starts it", async () => {
    mockProgram = program();
    mockSeen = 1;
    mockTargets = { day_id: 'd2', week: 3, phase: { kind: 'build', extra_set: true }, items: [
      { day_exercise_id: 'x1', exercise_uuid: 'bench', title: 'Bench Press', tracking_type: 'weight_reps', part: 'chest', sets: 4, reps: 8, weight_kg: 62.5, kind: 'up', note: 'You hit 60 kg × 10 last time, so up 2.5 kg. One extra set this week' },
    ] };
    render(<ProgramScreen />);
    expect(screen.getByText('WEEK 3 OF 8')).toBeOnTheScreen();
    expect(screen.getByText('Building · extra set')).toBeOnTheScreen();
    expect(screen.getAllByText('Full Body B')).toHaveLength(2); // next workout + this week's list
    expect(screen.getByText('Start Full Body B')).toBeOnTheScreen();
    expect(screen.getByText('4 × 8 · 62.5 kg')).toBeOnTheScreen();
    expect(screen.getByText(/so up 2.5 kg/)).toBeOnTheScreen();
    expect(screen.getByText('THIS WEEK · 1 OF 3 DONE')).toBeOnTheScreen();
    expect(screen.queryByText(/^NEW/)).toBeNull(); // the review was already seen
    fireEvent.press(screen.getByTestId('program-start'));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ planId: 'p1', dayId: 'd2' }, expect.anything()));
  });

  it('highlights a new review once and marks it seen', async () => {
    mockProgram = program();
    mockSeen = 0;
    render(<ProgramScreen />);
    await waitFor(() => expect(mockMarkSeen).toHaveBeenCalledWith(1));
    expect(screen.getByText('NEW · WEEK 2 REVIEW')).toBeOnTheScreen();
    expect(screen.getByText(checkin.note)).toBeOnTheScreen();
    expect(screen.getByText(/Row stalled for three weeks/)).toBeOnTheScreen();
  });

  it('free (a lapsed Pro): the program is paused, with no targets and no Start', () => {
    mockPro = false;
    mockProgram = program();
    mockSeen = 1;
    render(<ProgramScreen />);
    expect(screen.getByTestId('program-paused')).toBeOnTheScreen();
    expect(screen.queryByTestId('program-next')).toBeNull();
    fireEvent.press(screen.getByTestId('program-paused-pro'));
    expect(mockPush).toHaveBeenCalledWith('/pro');
  });

  it('shows what a finished block built', () => {
    mockProgram = program({ finished: true, week: 8, gains: [{ exercise_uuid: 'b', title: 'Bench Press', from: 80, to: 92, unit: 'kg' }] });
    mockSeen = 1;
    render(<ProgramScreen />);
    expect(screen.getByText('BLOCK COMPLETE')).toBeOnTheScreen();
    expect(screen.getByText('+15%')).toBeOnTheScreen();
    expect(screen.getByText('Build the next block')).toBeOnTheScreen();
    expect(screen.queryByTestId('program-next')).toBeNull();
  });
});
