import NetInfo from '@react-native-community/netinfo';

const mockQueue: Array<{ type: string; payload: any }> = [];
jest.mock('@/src/lib/cache/indexeddb', () => ({
  addToOfflineQueue: jest.fn(async (m: { type: string; payload: any }) => { mockQueue.push(m); }),
  getOfflineQueue: jest.fn(async () => [...mockQueue]),
}));
const mockCache = jest.fn(async (..._a: unknown[]) => {});
jest.mock('@/src/lib/offline/exerciseCache', () => ({ cacheExercise: (...a: unknown[]) => mockCache(...a) }));
const mockCreate = jest.fn();
const mockArchive = jest.fn();
jest.mock('@/src/lib/api/exercises', () => ({
  createCustomExercise: (...a: unknown[]) => mockCreate(...a),
  archiveCustomExercise: (...a: unknown[]) => mockArchive(...a),
}));

import { isExerciseQueued, offlineCreateExercise, removeCustomExercise } from '../customExercises';

const input = { uuid: 'u-1', title: '  Landmine press ', tracking_type: 'weight_reps' as const, primary_muscle: 'Shoulders', suggest: true };
const setOnline = (online: boolean) =>
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: online, isInternetReachable: online });
const httpError = (status: number, code?: string) => Object.assign(new Error('nope'), { status, code });

describe('offlineCreateExercise', () => {
  beforeEach(() => {
    mockQueue.length = 0;
    mockCreate.mockReset();
    mockArchive.mockReset();
    mockCache.mockClear();
  });

  it('creates online and caches the server copy', async () => {
    setOnline(true);
    mockCreate.mockResolvedValue({ uuid: 'u-1', title: 'Landmine press', owner_id: 'user' });
    const ex = await offlineCreateExercise(input);
    expect(ex.owner_id).toBe('user');
    expect(mockCache).toHaveBeenCalledWith('u-1', expect.objectContaining({ title: 'Landmine press' }));
    expect(mockQueue).toHaveLength(0);
  });

  it('queues and caches a local copy offline', async () => {
    setOnline(false);
    const ex = await offlineCreateExercise(input);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(ex).toMatchObject({ uuid: 'u-1', title: 'Landmine press', tracking_type: 'weight_reps', primary_muscles: [{ name: 'Shoulders' }] });
    expect(mockQueue).toEqual([{ type: 'CREATE_EXERCISE', payload: input }]);
    expect(await isExerciseQueued('u-1')).toBe(true);
    expect(await isExerciseQueued('other')).toBe(false);
  });

  it('queues when the request dies on the network', async () => {
    setOnline(true);
    mockCreate.mockRejectedValue(new Error('Network request failed'));
    await offlineCreateExercise(input);
    expect(mockQueue).toHaveLength(1);
  });

  it('surfaces the limit instead of queueing a create that can never sync', async () => {
    setOnline(true);
    mockCreate.mockRejectedValue(httpError(409, 'custom_limit'));
    await expect(offlineCreateExercise(input)).rejects.toMatchObject({ status: 409, code: 'custom_limit' });
    expect(mockQueue).toHaveLength(0);
  });
});

describe('removeCustomExercise', () => {
  beforeEach(() => { mockQueue.length = 0; mockArchive.mockReset(); });

  it('treats an already-removed exercise as done', async () => {
    mockArchive.mockRejectedValue(httpError(404));
    await expect(removeCustomExercise('u-1')).resolves.toBeUndefined();
  });

  it('refuses while the create is still queued', async () => {
    mockQueue.push({ type: 'CREATE_EXERCISE', payload: { uuid: 'u-1' } });
    await expect(removeCustomExercise('u-1')).rejects.toThrow('Not synced yet');
    expect(mockArchive).not.toHaveBeenCalled();
  });
});
