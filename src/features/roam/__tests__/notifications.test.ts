import AsyncStorage from '@react-native-async-storage/async-storage';
const mockPending = jest.fn();
const mockAck = jest.fn();
const mockActiveIds = jest.fn();
jest.mock('expo-live-activity', () => ({ startActivity: jest.fn(), updateActivity: jest.fn(), stopActivity: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, NativeModules: { FitNyxWorkoutControls: { getActiveActivityIds: () => mockActiveIds(), getPendingActions: (...args: unknown[]) => mockPending(...args), acknowledgeActions: (...args: unknown[]) => mockAck(...args) } }, NativeEventEmitter: jest.fn() }));
import { drainRoamControls, roamSnapshot, syncRoamNotification } from '../notifications';
import * as LiveActivity from 'expo-live-activity';
import { startRecording, getRecording, appendFixes, loadPoints, finishRecording } from '../recordingStore';
const T0 = Date.parse('2026-10-16T10:00:00Z');
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); mockPending.mockResolvedValue([]); mockAck.mockResolvedValue(undefined); mockActiveIds.mockResolvedValue([]); });
it('recreates an expired iOS activity when restoring an unfinished route', async () => {
  const meta = await startRecording('run', 'u1', T0);
  await AsyncStorage.setItem('fitnyx-roam:live-activity', JSON.stringify({ id: 'expired', sessionId: meta.clientId }));
  (LiveActivity.startActivity as jest.Mock).mockReturnValue('replacement');
  await syncRoamNotification(true);
  expect(LiveActivity.updateActivity).not.toHaveBeenCalled();
  expect(LiveActivity.startActivity).toHaveBeenCalledTimes(1);
  expect(JSON.parse((await AsyncStorage.getItem('fitnyx-roam:live-activity'))!)).toEqual({ id: 'replacement', sessionId: meta.clientId });
});
it('shows unavailable pace instead of fake numbers before GPS movement', async () => {
  const meta = await startRecording('run', 'u1', T0);
  expect(roamSnapshot(meta, [], T0 + 5000)).toMatchObject({ distanceM: 0, pace: '—', speed: '—', elapsed: 5, gps: 'Waiting for GPS' });
});
it('uses moving pace/speed for real distance while elapsed includes stationary time', async () => {
  const meta = await startRecording('cycle', 'u1', T0);
  const snapshot = roamSnapshot(meta, [[0, 0, 0, 5, 0], [0, 0.001, 20, 5, 0]], T0 + 25000);
  expect(snapshot.distanceM).toBeGreaterThan(110);
  expect(snapshot.speed).toBe('20.0');
  expect(snapshot.elapsed).toBe(25);
  expect(snapshot.gps).toBe('GPS connected');
});
it('replays background pauses before delayed GPS batches and excludes the paused interval', async () => {
  const meta = await startRecording('walk', 'u1', T0);
  mockPending.mockResolvedValue([
    { id: 'a', kind: 'roam', sessionId: meta.clientId, action: 'pause', timestamp: new Date(T0 + 10000).toISOString() },
    { id: 'b', kind: 'roam', sessionId: meta.clientId, action: 'resume', timestamp: new Date(T0 + 50000).toISOString() },
  ]);
  await drainRoamControls();
  await appendFixes([5, 20, 40, 55].map((sec) => ({ lat: 0, lng: sec / 100000, timestampMs: T0 + sec * 1000, accuracy: 5 })));
  expect((await loadPoints()).map((point) => [point[2], point[4]])).toEqual([[5, 0], [55, 1]]);
  expect(roamSnapshot((await getRecording())!, await loadPoints(), T0 + 60000).elapsed).toBe(20);
  expect(mockAck.mock.calls).toEqual([[['a']], [['b']]]);
});
it('never changes another recording or resurrects one already in review', async () => {
  const meta = await startRecording('run', 'u1', T0);
  await finishRecording();
  mockPending.mockResolvedValue([{ id: 'a', kind: 'roam', sessionId: meta.clientId, action: 'resume', timestampMs: Date.now() }]);
  await drainRoamControls();
  expect((await getRecording())?.status).toBe('paused');
  expect((await getRecording())?.finishedAtMs).toBeDefined();
});
it('does not acknowledge strength-workout actions from the shared iOS journal', async () => {
  mockPending.mockResolvedValue([{ id: 'a', kind: 'workout', sessionId: 'strength', action: 'pause' }]);
  await drainRoamControls();
  expect(mockAck).not.toHaveBeenCalled();
});
