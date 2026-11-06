import { buildTimeline } from '@/src/features/cardio/engine';
import { logRun, MIN_SAVE_SEC, runIsOrphaned, runResult, workoutHasSets } from '@/src/features/cardio/finish';
import { machineById } from '@/src/features/cardio/machines';
import { programById } from '@/src/features/cardio/programs';
import type { RunState } from '@/src/features/cardio/store';

const mockGet = jest.fn();
const mockLog = jest.fn();
const mockClear = jest.fn();
const mockHistory = jest.fn();
const mockComfort = jest.fn();
jest.mock('@/src/lib/offline/offlineApi', () => ({
  offlineGetSession: (...a: unknown[]) => mockGet(...a),
  offlineLogSet: (...a: unknown[]) => mockLog(...a),
}));
jest.mock('@/src/features/cardio/store', () => ({
  clearRun: (...a: unknown[]) => mockClear(...a),
  addHistory: (...a: unknown[]) => mockHistory(...a),
  saveComfort: (...a: unknown[]) => mockComfort(...a),
}));

const comfort = { primary: 10, secondary: 1, decline: false };
const run: RunState = {
  programId: 'fat-burn', programTitle: 'Fat Burn Zone', machineId: 'treadmill', exerciseUuid: 'tread', length: 'short', comfort, adjust: { primary: 1, secondary: 0 },
  startedAtMs: 0, pausedTotalMs: 0, pausedAtMs: null, skippedSec: 0, distanceM: 0, countedSec: 0, sessionId: 's1', ownsSession: true, wasReady: false, voice: true, finished: false,
};

describe('runResult', () => {
  it('works out time and distance from the saved run alone', () => {
    const t = buildTimeline(programById('fat-burn')!, 'short', machineById('treadmill'), comfort);
    expect(t.phases[0].base.primary).toBe(6);
    const r = runResult(run, 60_000);
    expect(r.activeSec).toBe(60);
    // First phase is 6 km/h, +1 live change = 7 km/h for 60 s.
    expect(r.distanceM).toBeCloseTo(116.67, 1);
  });

  it('keeps what was banked if the program is gone', () => {
    const r = runResult({ ...run, programId: 'nope', distanceM: 500, countedSec: 120 }, 9 * 3600 * 1000);
    expect(r.distanceM).toBe(500);
    expect(r.activeSec).toBe(120);
  });

  it('a run nobody came back to counts for the program, not the hours since', () => {
    const total = buildTimeline(programById('fat-burn')!, 'short', machineById('treadmill'), comfort).totalSec;
    expect(runResult(run, 9 * 3600 * 1000).activeSec).toBe(total);
    expect(runResult({ ...run, skippedSec: 100 }, 9 * 3600 * 1000).activeSec).toBe(total - 100);
  });
});

describe('logRun', () => {
  beforeEach(() => {
    [mockGet, mockLog, mockClear, mockHistory, mockComfort].forEach((m) => m.mockReset());
    mockClear.mockResolvedValue(undefined);
    mockHistory.mockResolvedValue([]);
    mockComfort.mockResolvedValue(undefined);
    mockLog.mockResolvedValue({ id: 'l1', exercise_uuid: 'tread' });
  });

  it('logs the next set of that exercise, remembers the settings and closes the run', async () => {
    mockGet.mockResolvedValue({ exercise_logs: [{ exercise_uuid: 'tread', set_index: 2 }, { exercise_uuid: 'other', set_index: 7 }] });
    await logRun('u1', run, 60_000);
    expect(mockLog).toHaveBeenCalledWith('s1', expect.objectContaining({ exercise_uuid: 'tread', set_number: 3, actual_reps: 0, actual_duration_sec: 60, actual_distance_m: 117 }));
    expect(mockComfort).toHaveBeenCalledWith('u1', 'treadmill', expect.objectContaining({ primary: 11 }));
    expect(mockHistory).toHaveBeenCalledWith('u1', expect.objectContaining({ programId: 'fat-burn', sec: 60 }));
    expect(mockClear).toHaveBeenCalledWith('u1');
  });

  it('keeps the run if the set could not be saved', async () => {
    mockGet.mockResolvedValue({ exercise_logs: [] });
    mockLog.mockRejectedValue(new Error('nope'));
    await expect(logRun('u1', run, 60_000)).rejects.toThrow('nope');
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('has a floor below which a run is not worth saving', () => {
    expect(MIN_SAVE_SEC).toBe(30);
  });
});

describe('workoutHasSets', () => {
  beforeEach(() => mockGet.mockReset());

  it('reads the workout', async () => {
    mockGet.mockResolvedValue({ exercise_logs: [{ id: 'a' }] });
    await expect(workoutHasSets('s1')).resolves.toBe(true);
    mockGet.mockResolvedValue({ exercise_logs: [] });
    await expect(workoutHasSets('s1')).resolves.toBe(false);
    mockGet.mockResolvedValue({});
    await expect(workoutHasSets('s1')).resolves.toBe(false);
  });

  it('assumes it has sets when it can’t tell, so nothing is thrown away', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    await expect(workoutHasSets('s1')).resolves.toBe(true);
  });
});

describe('runIsOrphaned', () => {
  const base = { hasOpenWorkout: false, workoutLoading: false, offline: false };

  it('is true only when the workout is known to be gone', () => {
    expect(runIsOrphaned(run, base)).toBe(true);
    expect(runIsOrphaned(run, { ...base, hasOpenWorkout: true })).toBe(false);
    expect(runIsOrphaned(run, { ...base, workoutLoading: true })).toBe(false);
    expect(runIsOrphaned(run, { ...base, offline: true })).toBe(false);
    expect(runIsOrphaned(null, base)).toBe(false);
  });
});
