const mockPending = jest.fn();
const mockAck = jest.fn();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, NativeModules: { FitNyxWorkoutControls: { getPendingActions: (...args: unknown[]) => mockPending(...args), acknowledgeActions: (...args: unknown[]) => mockAck(...args) } }, NativeEventEmitter: jest.fn() }));
jest.mock('@/src/lib/offline/offlineApi', () => ({ offlinePauseSession: jest.fn(), offlineResumeSession: jest.fn() }));
jest.mock('@/src/lib/offline/offlineStore', () => ({ getActiveOfflineSessionId: jest.fn(), getOfflineSession: jest.fn(), resolveId: jest.fn(async (id) => id === 'offline-1' ? 'session-1' : id) }));
jest.mock('@/src/lib/workoutActivityDetails', () => ({ loadWorkoutDetails: jest.fn(), updateWorkoutDetails: jest.fn() }));
import { drainNativeWorkoutControls } from '../nativeWorkoutControls';
import { offlinePauseSession, offlineResumeSession } from '../offline/offlineApi';
import { getActiveOfflineSessionId, getOfflineSession } from '../offline/offlineStore';
import { updateWorkoutDetails } from '../workoutActivityDetails';
const action = (id: string, kind: string, sessionId = 'session-1') => ({ id, sessionId, action: kind, timestamp: `2026-10-15T10:00:0${id}.000Z`, content: JSON.stringify({ restEnd: 1792058460000 }) });
beforeEach(() => {
  jest.clearAllMocks();
  (getActiveOfflineSessionId as jest.Mock).mockResolvedValue('session-1');
  (getOfflineSession as jest.Mock).mockResolvedValue({ id: 'session-1', status: 'in_progress' });
  (offlinePauseSession as jest.Mock).mockResolvedValue({});
  (offlineResumeSession as jest.Mock).mockResolvedValue({});
  mockAck.mockResolvedValue(undefined);
});
it('replays pause/resume in tap order using the original timestamps', async () => {
  mockPending.mockResolvedValue([action('1', 'pause'), action('2', 'resume')]);
  await drainNativeWorkoutControls();
  expect(offlinePauseSession).toHaveBeenCalledWith('session-1', '2026-10-15T10:00:01.000Z');
  expect(offlineResumeSession).toHaveBeenCalledWith('session-1', '2026-10-15T10:00:02.000Z');
  expect(mockAck.mock.calls).toEqual([[['1']], [['2']]]);
  expect((offlinePauseSession as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((offlineResumeSession as jest.Mock).mock.invocationCallOrder[0]);
});
it('keeps failed actions pending and does not replay later actions out of order', async () => {
  mockPending.mockResolvedValue([action('1', 'pause'), action('2', 'resume')]);
  (offlinePauseSession as jest.Mock).mockRejectedValueOnce(new Error('network'));
  await expect(drainNativeWorkoutControls()).rejects.toThrow('network');
  expect(mockAck).not.toHaveBeenCalled();
  expect(offlineResumeSession).not.toHaveBeenCalled();
});
it('ignores controls from a previous workout', async () => {
  mockPending.mockResolvedValue([action('1', 'pause', 'old-session')]);
  await drainNativeWorkoutControls();
  expect(offlinePauseSession).not.toHaveBeenCalled();
  expect(mockAck).toHaveBeenCalledWith(['1']);
});
it('resolves promoted offline sessions and restores native rest changes', async () => {
  mockPending.mockResolvedValue([action('1', 'extendRest', 'offline-1')]);
  await drainNativeWorkoutControls();
  expect(updateWorkoutDetails).toHaveBeenCalledWith('session-1', { restEnd: 1792058460000 });
  expect(offlinePauseSession).not.toHaveBeenCalled();
});
it('deduplicates simultaneous foreground and native event drains', async () => {
  mockPending.mockResolvedValue([action('1', 'pause')]);
  await Promise.all([drainNativeWorkoutControls(), drainNativeWorkoutControls()]);
  expect(offlinePauseSession).toHaveBeenCalledTimes(1);
});
it('drains another tap arriving while a previous action is in flight', async () => {
  mockPending.mockResolvedValueOnce([action('1', 'pause')]).mockResolvedValueOnce([action('2', 'resume')]).mockResolvedValue([]);
  await drainNativeWorkoutControls();
  expect(mockAck.mock.calls).toEqual([[['1']], [['2']]]);
});
