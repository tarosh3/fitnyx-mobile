import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockGetDayExercises = jest.fn();
jest.mock('@/src/lib/api/workoutPlans', () => ({ getDayExercises: (id: string) => mockGetDayExercises(id) }));
jest.mock('@/src/lib/api/exercises', () => ({ fetchExerciseHistory: jest.fn(async () => ({ history: [] })) }));
jest.mock('@/src/lib/offline/offlineApi', () => ({
  offlineGetSession: jest.fn(async () => ({ session: { id: 's1', status: 'paused', day_id: 'day-1' }, exercise_logs: [] })),
  offlineLogSet: jest.fn(), offlineUpdateLog: jest.fn(), offlineDeleteLog: jest.fn(), markOfflineLogPr: jest.fn(),
}));
jest.mock('@/src/lib/offline/exerciseCache', () => ({ cacheExercisesForDay: jest.fn(async () => {}), fetchExerciseWithCache: jest.fn(async () => null) }));
jest.mock('@/src/lib/offline/videoCache', () => ({ cacheWorkoutVideos: jest.fn(async () => {}) }));
jest.mock('@/src/lib/offline/offlineStore', () => ({ getIdMapping: jest.fn(async () => null), isOfflineId: () => false }));
jest.mock('@/src/providers/WorkoutProvider', () => ({ useWorkout: () => ({ activeSession: null, setActiveSession: jest.fn() }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const mockLoadProgramTargets = jest.fn(async (_userId: string, _dayId: string): Promise<unknown> => null);
jest.mock('@/src/features/program/data', () => ({ loadProgramTargets: (u: string, d: string) => mockLoadProgramTargets(u, d) }));
jest.mock('@/src/hooks/useOfflineAware', () => ({ useOfflineAware: () => ({ isOffline: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ setParams: jest.fn() }) }));

import { loadTodayRun, saveTodayRun } from '@/src/features/workouts/today/store';
import { pendingRows } from '../rows';
import { useWorkoutLogger } from '../useWorkoutLogger';

const bench = { id: 'e1', exercise_uuid: 'bench', target_sets: 3, exercise: { uuid: 'bench', title: 'Bench Press' } };
const networkDown = () => mockGetDayExercises.mockRejectedValueOnce(new Error('Network request failed'));

async function load() {
  const hook = renderHook(() => useWorkoutLogger('s1'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook.result;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockGetDayExercises.mockReset();
});

describe('planned exercises with a bad connection', () => {
  it('comes back from the phone after being loaded online once', async () => {
    mockGetDayExercises.mockResolvedValueOnce({ data: [bench] });
    await load();

    networkDown();
    await waitFor(async () => expect(await AsyncStorage.getItem('fitnyx-db:exercises')).toContain('bench'));
    const result = await load();

    expect(result.current.blocks.map((b) => b.uuid)).toEqual(['bench']);
    expect(result.current.plannedMissing).toBe(false);
  });

  it('says the exercises are missing instead of showing an empty workout', async () => {
    networkDown();
    const result = await load();
    expect(result.current.blocks).toHaveLength(0);
    expect(result.current.plannedMissing).toBe(true);
  });

  it('does not call a real server answer "missing"', async () => {
    mockGetDayExercises.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));
    const result = await load();
    expect(result.current.plannedMissing).toBe(false);
  });
});

describe('a day of the adaptive program', () => {
  it("uses today's targets from the program instead of the stored ones", async () => {
    mockGetDayExercises.mockResolvedValueOnce({ data: [{ ...bench, target_reps: 10 }] });
    mockLoadProgramTargets.mockResolvedValueOnce({
      day_id: 'd1', week: 3, phase: { kind: 'build', extra_set: true },
      items: [{ day_exercise_id: 'e1', exercise_uuid: 'bench', sets: 4, reps: 8, weight_kg: 62.5, kind: 'up', note: 'up 2.5 kg' }],
    });
    const result = await load();
    expect(mockLoadProgramTargets).toHaveBeenCalledWith('u1', 'day-1');
    expect(result.current.blocks[0].planned).toMatchObject({ target_sets: 4, target_reps: 8, target_weight_kg: 62.5 });
  });
});

describe('logging a set a timer ran on', () => {
  const treadmill = { id: 'e2', exercise_uuid: 'tread', target_sets: 1, target_duration_sec: 1200, exercise: { uuid: 'tread', title: 'Treadmill Run', tracking_type: 'cardio' } };

  it('logs the time on the timer, not the planned time', async () => {
    const { offlineLogSet } = jest.requireMock('@/src/lib/offline/offlineApi') as { offlineLogSet: jest.Mock };
    offlineLogSet.mockReset();
    offlineLogSet.mockResolvedValue({ id: 'l1', set_index: 1, exercise_uuid: 'tread', reps: 0, duration_sec: 420 });
    mockGetDayExercises.mockResolvedValueOnce({ data: [treadmill] });
    const result = await load();

    await act(async () => { await result.current.logPending(0, 0, { durationSec: 420 }); });
    expect(offlineLogSet).toHaveBeenCalledWith('s1', expect.objectContaining({ exercise_uuid: 'tread', actual_duration_sec: 420 }));
  });

  it('an early stop is that set only: later sets keep their target', async () => {
    const plank = { id: 'e3', exercise_uuid: 'plank', target_sets: 3, target_duration_sec: 60, exercise: { uuid: 'plank', title: 'Plank', tracking_type: 'duration' } };
    const { offlineLogSet } = jest.requireMock('@/src/lib/offline/offlineApi') as { offlineLogSet: jest.Mock };
    offlineLogSet.mockReset();
    offlineLogSet.mockResolvedValue({ id: 'l1', set_index: 1, exercise_uuid: 'plank', reps: 0, duration_sec: 19 });
    mockGetDayExercises.mockResolvedValueOnce({ data: [plank] });
    const result = await load();

    await act(async () => { await result.current.logPending(0, 0, { durationSec: 19 }); });
    expect(offlineLogSet).toHaveBeenCalledWith('s1', expect.objectContaining({ actual_duration_sec: 19 }));
    expect(pendingRows(result.current.blocks[0]).map((r) => r.durationSec)).toEqual([60, 60]);
  });

  it('logs the planned time when no timer ran', async () => {
    const { offlineLogSet } = jest.requireMock('@/src/lib/offline/offlineApi') as { offlineLogSet: jest.Mock };
    offlineLogSet.mockReset();
    offlineLogSet.mockResolvedValue({ id: 'l1', set_index: 1, exercise_uuid: 'tread', reps: 0, duration_sec: 1200 });
    mockGetDayExercises.mockResolvedValueOnce({ data: [treadmill] });
    const result = await load();

    await act(async () => { await result.current.logPending(0, 0); });
    expect(offlineLogSet).toHaveBeenCalledWith('s1', expect.objectContaining({ actual_duration_sec: 1200 }));
  });
});

describe("a workout started from Today's workout", () => {
  const { offlineGetSession } = jest.requireMock('@/src/lib/offline/offlineApi');
  const row = (uuid: string, kg: number) => ({
    id: `today-${uuid}`, day_id: '', exercise_uuid: uuid, exercise_order: 0, target_sets: 4, target_reps: 8, target_weight_kg: kg, rest_seconds: 75, created_at: '',
    exercise: { uuid, title: uuid, tracking_type: 'weight_reps' },
  });
  const noDay = () => offlineGetSession.mockResolvedValue({ session: { id: 's1', status: 'paused' }, exercise_logs: [] });
  afterEach(() => offlineGetSession.mockResolvedValue({ session: { id: 's1', status: 'paused', day_id: 'day-1' }, exercise_logs: [] }));

  it('opens with its targets and title', async () => {
    noDay();
    await saveTodayRun({ sessionId: 's1', title: 'Legs', items: [row('squat', 62.5) as any] });
    const result = await load();
    expect(result.current.planTitle).toBe('Legs');
    expect(result.current.blocks[0].planned?.target_sets).toBe(4);
    expect(pendingRows(result.current.blocks[0])).toHaveLength(4);
    expect(pendingRows(result.current.blocks[0])[0]).toMatchObject({ weightKg: 62.5, reps: 8 });
  });

  it("ignores another session's plan", async () => {
    noDay();
    await saveTodayRun({ sessionId: 'other', title: 'Legs', items: [row('squat', 62.5) as any] });
    const result = await load();
    expect(result.current.planTitle).toBeNull();
    expect(result.current.blocks).toHaveLength(0);
  });

  it('keeps a swap when the workout is reopened', async () => {
    noDay();
    await saveTodayRun({ sessionId: 's1', title: 'Legs', items: [row('legpress', 100) as any, row('curl', 30) as any] });
    const result = await load();
    const goblet = { uuid: 'goblet', title: 'Goblet', tracking_type: 'weight_reps' } as any;
    act(() => result.current.swapBlock(0, goblet, row('goblet', 24) as any));
    await waitFor(async () => expect((await loadTodayRun('s1'))?.items.map((i) => i.exercise_uuid)).toEqual(['goblet', 'curl']));

    const again = await load();
    expect(again.current.blocks.map((b) => b.uuid)).toEqual(['goblet', 'curl']);
    expect(pendingRows(again.current.blocks[0])[0].weightKg).toBe(24);
  });

  it('a swap from the full list keeps the sets and reps, with no made-up weight', async () => {
    noDay();
    await saveTodayRun({ sessionId: 's1', title: 'Legs', items: [row('legpress', 100) as any] });
    const result = await load();
    act(() => result.current.swapBlock(0, { uuid: 'hack', title: 'Hack', tracking_type: 'weight_reps' } as any));
    expect(result.current.blocks[0].planned).toMatchObject({ exercise_uuid: 'hack', target_sets: 4, target_reps: 8 });
    expect(result.current.blocks[0].planned?.target_weight_kg).toBeUndefined();
  });

  it('a removed exercise stays removed', async () => {
    noDay();
    await saveTodayRun({ sessionId: 's1', title: 'Legs', items: [row('legpress', 100) as any, row('curl', 30) as any] });
    const result = await load();
    act(() => result.current.removeBlock(0));
    await waitFor(async () => expect((await loadTodayRun('s1'))?.items.map((i) => i.exercise_uuid)).toEqual(['curl']));
  });
});

it('a plain routine swap stays an added exercise', async () => {
  mockGetDayExercises.mockResolvedValueOnce({ data: [bench] });
  const result = await load();
  act(() => result.current.swapBlock(0, { uuid: 'fly', title: 'Fly' } as any));
  expect(result.current.blocks[0].planned).toBeNull();
});
