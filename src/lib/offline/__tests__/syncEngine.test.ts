const mockQueue: Array<{ id: string; type: string; payload: any; timestamp: number }> = [];

jest.mock('@/src/lib/cache/indexeddb', () => ({
  getOfflineQueue: jest.fn(async () => [...mockQueue]),
  removeFromOfflineQueue: jest.fn(async (id: string) => {
    const i = mockQueue.findIndex((m) => m.id === id);
    if (i !== -1) mockQueue.splice(i, 1);
  }),
}));
jest.mock('@/src/lib/offline/offlineStore', () => ({
  setIdMapping: jest.fn(),
  getIdMapping: jest.fn(async () => null),
  clearIdMappings: jest.fn(),
  clearPersistedSession: jest.fn(),
  cleanupStaleSessions: jest.fn(async () => {}),
}));
jest.mock('@/src/lib/api', () => ({ saveMetric: jest.fn() }));
const mockLogSet = jest.fn();
jest.mock('@/src/lib/api/workoutSessions', () => ({
  logExerciseSet: (...a: unknown[]) => mockLogSet(...a),
  updateExerciseLog: jest.fn(),
  deleteExerciseLog: jest.fn(),
  sessionAction: jest.fn(),
}));

import { isTransientStatus, processOfflineQueue } from '../syncEngine';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

function queueLogSet(id: string) {
  mockQueue.push({
    id,
    type: 'LOG_SET',
    payload: { sessionId: 'real-session', exerciseUuid: 'ex', setNumber: 1, reps: 8, weightKg: 50 },
    timestamp: Date.now(),
  });
}

describe('processOfflineQueue', () => {
  beforeEach(() => {
    mockQueue.length = 0;
    mockLogSet.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it.each([408, 429, 500, 502, 503])('keeps a mutation queued on transient %i', async (status) => {
    queueLogSet('m1');
    mockLogSet.mockRejectedValue(httpError(status));

    const result = await processOfflineQueue();

    expect(result.failed).toBe(1);
    expect(mockQueue.map((m) => m.id)).toEqual(['m1']);
  });

  it('drops a mutation the server rejects as invalid (400)', async () => {
    queueLogSet('m1');
    mockLogSet.mockRejectedValue(httpError(400));

    await processOfflineQueue();

    expect(mockQueue).toHaveLength(0);
  });

  it('removes a mutation once it syncs', async () => {
    queueLogSet('m1');
    mockLogSet.mockResolvedValue({ id: 'log-1' });

    const result = await processOfflineQueue();

    expect(result.processed).toBe(1);
    expect(mockQueue).toHaveLength(0);
  });
});

describe('isTransientStatus', () => {
  it('classifies statuses', () => {
    expect([408, 429, 500, 503].every(isTransientStatus)).toBe(true);
    expect([400, 401, 403, 404, 409, 422].some(isTransientStatus)).toBe(false);
  });
});
