import { startWorkout } from '../start';
import { offlinePauseSession, offlineStartSession } from '@/src/lib/offline';

jest.mock('@/src/lib/offline', () => ({
  offlineStartSession: jest.fn(),
  offlinePauseSession: jest.fn(),
}));

const session = { id: 's1', status: 'paused', total_duration_sec: 0 } as any;

it('joins a start that is still running instead of creating a second session', async () => {
  let resolve!: (s: unknown) => void;
  (offlineStartSession as jest.Mock).mockReturnValueOnce(new Promise((r) => { resolve = r; }));
  (offlinePauseSession as jest.Mock).mockResolvedValue(session);
  const deps = { router: { push: jest.fn() } as any, setActiveSession: jest.fn() };

  const first = startWorkout({}, deps);
  const second = startWorkout({}, deps);
  resolve(session);
  await Promise.all([first, second]);

  expect(offlineStartSession).toHaveBeenCalledTimes(1);
  expect(deps.router.push).toHaveBeenCalledTimes(1);
  expect(deps.router.push).toHaveBeenCalledWith('/workouts/session/s1');
});

it('allows a new start once the previous one failed', async () => {
  (offlineStartSession as jest.Mock).mockReset().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(session);
  const deps = { router: { push: jest.fn() } as any, setActiveSession: jest.fn() };

  await expect(startWorkout({}, deps)).rejects.toThrow('offline');
  await startWorkout({}, deps);
  expect(offlineStartSession).toHaveBeenCalledTimes(2);
  expect(deps.router.push).toHaveBeenCalledTimes(1);
});
