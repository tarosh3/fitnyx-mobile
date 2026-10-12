import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// End-to-end over the real offline store + queue: a workout started offline,
// synced on reconnect, then continued online under its offline id.

let mockServerLogId = 0;
const mockApi = {
  sessionAction: jest.fn(async (action: string, _args: unknown) =>
    action === 'start' ? { id: 'srv-session', status: 'in_progress' } : { id: 'srv-session' },
  ),
  logExerciseSet: jest.fn(async (..._args: unknown[]) => ({ id: `srv-log-${++mockServerLogId}` })),
  updateExerciseLog: jest.fn(async (id: string, _data: unknown) => ({ id })),
  deleteExerciseLog: jest.fn(async (_id: string) => undefined),
};
jest.mock('@/src/lib/api/workoutSessions', () => ({
  ...jest.requireActual('@/src/lib/api/workoutSessions'),
  sessionAction: (action: string, args: unknown) => mockApi.sessionAction(action, args),
  logExerciseSet: (...args: unknown[]) => mockApi.logExerciseSet(...args),
  updateExerciseLog: (id: string, data: unknown) => mockApi.updateExerciseLog(id, data),
  deleteExerciseLog: (id: string) => mockApi.deleteExerciseLog(id),
}));
jest.mock('@/src/lib/api', () => ({ saveMetric: jest.fn() }));
jest.mock('@/src/lib/api/activities', () => ({ createActivity: jest.fn() }));

import { getOfflineQueue } from '@/src/lib/cache/indexeddb';
import {
  offlineDeleteLog,
  offlineFinishSession,
  offlineLogSet,
  offlineStartSession,
  offlineUpdateLog,
} from '../offlineApi';
import { getActiveOfflineSessionId, getOfflineLogs } from '../offlineStore';
import { processOfflineQueue } from '../syncEngine';

const setOnline = (online: boolean) =>
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: online, isInternetReachable: online });

const set = (n: number, reps = 8) => ({ exercise_uuid: 'squat', set_number: n, actual_reps: reps, actual_weight_kg: 60 });

beforeEach(async () => {
  await AsyncStorage.clear();
  mockServerLogId = 0;
  Object.values(mockApi).forEach((fn) => fn.mockClear());
});

afterAll(() => setOnline(true));

it('continues an offline-started workout online after it syncs', async () => {
  setOnline(false);
  const session = await offlineStartSession({ workout_plan_id: 'p', workout_day_id: 'd' } as never);
  const offlineSet = await offlineLogSet(session.id, set(1));

  setOnline(true);
  await processOfflineQueue();
  expect(await getOfflineQueue()).toHaveLength(0);
  expect(mockApi.logExerciseSet).toHaveBeenCalledWith('srv-session', expect.anything());
  expect(await getActiveOfflineSessionId()).toBe('srv-session');

  // The screen still holds the offline ids; everything goes straight to the server.
  await offlineLogSet(session.id, set(2));
  expect(mockApi.logExerciseSet).toHaveBeenLastCalledWith('srv-session', expect.anything());

  await offlineUpdateLog(session.id, offlineSet.id, { actual_reps: 10 });
  expect(mockApi.updateExerciseLog).toHaveBeenCalledWith('srv-log-1', { actual_reps: 10 });

  await offlineDeleteLog(session.id, offlineSet.id);
  expect(mockApi.deleteExerciseLog).toHaveBeenCalledWith('srv-log-1');

  await offlineFinishSession(session.id);
  expect(mockApi.sessionAction).toHaveBeenLastCalledWith('finish', expect.objectContaining({ sessionId: 'srv-session' }));
  expect(await getOfflineQueue()).toHaveLength(0);
});

it('queues actions on a synced session against its server id when offline again', async () => {
  setOnline(false);
  const session = await offlineStartSession({ workout_plan_id: 'p', workout_day_id: 'd' } as never);
  setOnline(true);
  await processOfflineQueue();

  setOnline(false);
  await offlineLogSet(session.id, set(1));
  await offlineFinishSession(session.id);

  setOnline(true);
  await processOfflineQueue();
  expect(await getOfflineQueue()).toHaveLength(0);
  expect(mockApi.logExerciseSet).toHaveBeenCalledWith('srv-session', expect.anything());
  expect(mockApi.sessionAction).toHaveBeenLastCalledWith('finish', expect.objectContaining({ sessionId: 'srv-session' }));
});

it('applies an edit made while the set was syncing', async () => {
  setOnline(false);
  const session = await offlineStartSession({ workout_plan_id: 'p', workout_day_id: 'd' } as never);
  const offlineSet = await offlineLogSet(session.id, set(1, 8));

  mockApi.logExerciseSet.mockImplementationOnce(async () => {
    await offlineUpdateLog(session.id, offlineSet.id, { actual_reps: 12 }); // still offline-routed: set not synced
    return { id: 'srv-log-x' };
  });
  setOnline(true);
  await processOfflineQueue();

  expect(mockApi.updateExerciseLog).toHaveBeenCalledWith('srv-log-x', expect.objectContaining({ actual_reps: 12 }));
  expect(await getOfflineQueue()).toHaveLength(0);
});

it('deletes a set removed while it was syncing', async () => {
  setOnline(false);
  const session = await offlineStartSession({ workout_plan_id: 'p', workout_day_id: 'd' } as never);
  const offlineSet = await offlineLogSet(session.id, set(1));

  mockApi.logExerciseSet.mockImplementationOnce(async () => {
    await offlineDeleteLog(session.id, offlineSet.id);
    return { id: 'srv-log-y' };
  });
  setOnline(true);
  await processOfflineQueue();

  expect(mockApi.deleteExerciseLog).toHaveBeenCalledWith('srv-log-y');
  expect(await getOfflineLogs('srv-session')).toHaveLength(0);
});
