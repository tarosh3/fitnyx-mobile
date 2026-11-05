import { machineById } from '@/src/features/cardio/machines';
import { programById } from '@/src/features/cardio/programs';
import { beginRun } from '@/src/features/cardio/start';

const mockStart = jest.fn();
jest.mock('@/src/lib/offline', () => ({ offlineStartSession: (...a: unknown[]) => mockStart(...a), offlinePauseSession: jest.fn() }));
jest.mock('@/src/features/cardio/store', () => ({ saveRun: jest.fn(async () => undefined), saveComfort: jest.fn(async () => undefined) }));

const input = (activeSession: unknown) => ({
  userId: 'u1', program: programById('warm-gentle')!, machine: machineById('treadmill'), exerciseUuid: 'tread', length: 'short' as const,
  comfort: { primary: 7, secondary: 1, decline: false }, voice: true, activeSession: activeSession as never,
  setActiveSession: jest.fn(), resumeActiveSession: jest.fn(async () => undefined),
});

describe('beginRun', () => {
  beforeEach(() => mockStart.mockReset());

  it('opens a workout when none is open, and owns it', async () => {
    mockStart.mockResolvedValue({ id: 'new' });
    const i = input(null);
    const run = await beginRun(i);
    expect(run).toMatchObject({ sessionId: 'new', ownsSession: true, wasReady: false });
    expect(i.setActiveSession).toHaveBeenCalledWith({ id: 'new' });
  });

  it('joins a workout whose clock has not started, and remembers that', async () => {
    const i = input({ id: 's1', status: 'paused', total_duration_sec: 0 });
    const run = await beginRun(i);
    expect(run).toMatchObject({ sessionId: 's1', ownsSession: false, wasReady: true });
    expect(i.resumeActiveSession).toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('joins a workout already under way', async () => {
    const i = input({ id: 's1', status: 'in_progress', total_duration_sec: 300 });
    expect(await beginRun(i)).toMatchObject({ ownsSession: false, wasReady: false });
    expect(i.resumeActiveSession).not.toHaveBeenCalled();
  });

  it('joins the open workout the server reports instead of failing', async () => {
    mockStart.mockRejectedValue({ status: 409, data: { session: { id: 'open' } } });
    expect(await beginRun(input(null))).toMatchObject({ sessionId: 'open', ownsSession: false });
  });
});
