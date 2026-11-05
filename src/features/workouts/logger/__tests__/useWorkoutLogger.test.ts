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
jest.mock('@/src/hooks/useOfflineAware', () => ({ useOfflineAware: () => ({ isOffline: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ setParams: jest.fn() }) }));

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
