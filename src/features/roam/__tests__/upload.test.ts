const mockCreate = jest.fn();
jest.mock('@/src/lib/api/activities', () => ({ createActivity: (...a: unknown[]) => mockCreate(...a) }));
const mockQueue = jest.fn(async (..._a: unknown[]) => {});
jest.mock('@/src/lib/cache/indexeddb', () => ({ addToOfflineQueue: (...a: unknown[]) => mockQueue(...a) }));
jest.mock('@/src/lib/api', () => ({ isAuthError: (e: { isAuthError?: boolean }) => e?.isAuthError === true }));
jest.mock('@/src/lib/offline/syncEngine', () => ({
  isTransientStatus: (s: number) => s === 408 || s === 429 || s >= 500,
}));

import type { RoamPoint } from '@/src/features/roam/geo';
import type { RecordingMeta } from '@/src/features/roam/recordingStore';
import { buildActivityInput, saveRoam } from '@/src/features/roam/upload';

const T0 = Date.UTC(2026, 9, 10, 0, 30); // local date depends on TZ; asserted loosely
const meta: RecordingMeta = {
  clientId: '7b0c6f7e-2f5a-4f6d-9a0e-1c2d3e4f5a6b',
  type: 'run',
  startedAtMs: T0,
  status: 'paused',
  segment: 0,
  pausedAtMs: null,
  pausedTotalMs: 0,
  chunkCount: 1,
  pointCount: 3,
};
const pts: RoamPoint[] = [
  [19.07, 72.87, 0, 5, 0],
  [19.071, 72.87, 30, 5, 0],
  [19.072, 72.87, 60, 5, 0],
];

beforeEach(() => {
  mockCreate.mockReset();
  mockQueue.mockClear();
});

describe('buildActivityInput', () => {
  it('builds the payload with ISO times and a local date', () => {
    const input = buildActivityInput(meta, pts, T0 + 90_000)!;
    expect(input).toMatchObject({
      client_activity_id: meta.clientId,
      activity_type: 'run',
      started_at: new Date(T0).toISOString(),
      ended_at: new Date(T0 + 90_000).toISOString(),
      points: pts,
    });
    expect(input.local_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('caps a forgotten recording at the 12 h server limit and trims later points', () => {
    const late: RoamPoint[] = [...pts, [19.08, 72.87, 13 * 3600, 5, 0]];
    const input = buildActivityInput(meta, late, T0 + 20 * 3600 * 1000)!;
    expect(new Date(input.ended_at).getTime() - T0).toBeLessThanOrEqual(12 * 3600 * 1000);
    expect(input.points).toHaveLength(3);
  });

  it('returns null with fewer than 2 points', () => {
    expect(buildActivityInput(meta, pts.slice(0, 1), T0 + 90_000)).toBeNull();
  });
});

describe('saveRoam', () => {
  it('returns the saved activity when online', async () => {
    mockCreate.mockResolvedValue({ id: 'act-1' });
    await expect(saveRoam(meta, pts)).resolves.toEqual({ status: 'saved', activity: { id: 'act-1' } });
    expect(mockQueue).not.toHaveBeenCalled();
  });

  it.each([undefined, 429, 503])('queues for offline sync on a network/transient failure (%s)', async (status) => {
    mockCreate.mockRejectedValue(Object.assign(new Error('x'), { status }));
    await expect(saveRoam(meta, pts)).resolves.toEqual({ status: 'queued' });
    expect(mockQueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'SAVE_ACTIVITY' }));
  });

  it('throws a 4xx so the user sees it, without queueing', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('started_at: too far in the past'), { status: 400 }));
    await expect(saveRoam(meta, pts)).rejects.toThrow('too far in the past');
    expect(mockQueue).not.toHaveBeenCalled();
  });

  it('reports too-short without calling the API', async () => {
    await expect(saveRoam(meta, pts.slice(0, 1))).resolves.toEqual({ status: 'too-short' });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
