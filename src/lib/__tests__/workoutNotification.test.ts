import { Platform } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { buildWorkoutNotification, initialize, onAction } from '@/src/lib/workoutNotification';
import { elapsedForSession, getWorkoutState } from '@/src/lib/workoutNotificationState';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { createChannel: jest.fn(), getNotificationCategories: jest.fn(async () => [{ id: 'water' }]), setNotificationCategories: jest.fn(), onForegroundEvent: jest.fn(() => jest.fn()) },
  AndroidCategory: { SERVICE: 'service' }, AndroidImportance: { LOW: 2 }, AndroidStyle: { BIGPICTURE: 1 },
  EventType: { PRESS: 1, ACTION_PRESS: 2 },
}));
jest.mock('@/src/lib/workoutLiveActivity', () => ({ syncWorkoutLiveActivity: jest.fn() }));

const session: WorkoutSession = {
  id: 's1', user_id: 'u1', status: 'paused', total_duration_sec: 0,
  started_at: '2026-10-14T10:00:00Z', last_resumed_at: '2026-10-14T10:02:00Z',
  workout_date: '2026-10-14', created_at: '2026-10-14T10:00:00Z',
};

afterEach(() => jest.restoreAllMocks());

it('shows Start and a stopped clock for a ready workout, without a destructive Finish shortcut', () => {
  const payload = buildWorkoutNotification(session);
  expect(payload.data).toEqual({ sessionId: 's1', workoutState: 'ready' });
  expect(payload.android?.actions?.map((action) => action.title)).toEqual(['Start', 'Open workout']);
  expect(payload.android?.showChronometer).toBe(false);
  expect(payload.android?.asForegroundService).toBeUndefined();
  expect(payload.android?.onlyAlertOnce).toBe(true);
});

it('includes the running interval in the native clock and freezes the confirmed paused duration', () => {
  const now = Date.parse('2026-10-14T10:03:05Z');
  jest.spyOn(Date, 'now').mockReturnValue(now);
  const running = { ...session, status: 'in_progress' as const, total_duration_sec: 120 };
  expect(elapsedForSession(running)).toBe(185);
  const payload = buildWorkoutNotification(running);
  expect(payload.android?.timestamp).toBe(now - 185000);
  expect(payload.android?.showChronometer).toBe(true);
  expect(payload.android?.actions?.[0].title).toBe('Pause');
  const paused = { ...running, status: 'paused' as const, total_duration_sec: 185 };
  expect(elapsedForSession(paused, now + 600000)).toBe(185);
  expect(buildWorkoutNotification(paused).body).toContain('3:05');
  expect(buildWorkoutNotification(paused).android?.actions?.[0].title).toBe('Resume');
});

it('does not subtract time when the device clock moves backward', () => {
  expect(elapsedForSession({ ...session, status: 'in_progress', total_duration_sec: 120 }, 0)).toBe(120);
  expect(getWorkoutState({ ...session, status: 'in_progress' })).toBe('running');
});

it('registers all iOS action states while keeping unrelated categories', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await initialize();
  expect(notifee.setNotificationCategories).toHaveBeenCalledWith([
    { id: 'water' },
    ...(['ready', 'running', 'paused'] as const).map((state) => ({
      id: `workout-${state}`,
      actions: [
        { id: state === 'running' ? 'pause' : 'resume', title: state === 'ready' ? 'Start' : state === 'running' ? 'Pause' : 'Resume' },
        { id: 'open', title: 'Open workout', foreground: true },
      ],
    })),
  ]);
});

it('ignores unrelated and retired actions, and routes an open tap without starting', () => {
  const callback = jest.fn();
  onAction(callback);
  const handle = jest.mocked(notifee.onForegroundEvent).mock.calls.at(-1)![0];
  const notification = buildWorkoutNotification(session);
  handle({ type: EventType.ACTION_PRESS, detail: { notification: { ...notification, id: 'water' }, pressAction: { id: 'resume' } } });
  handle({ type: EventType.ACTION_PRESS, detail: { notification, pressAction: { id: 'finish' } } });
  expect(callback).not.toHaveBeenCalled();
  handle({ type: EventType.PRESS, detail: { notification } });
  expect(callback).toHaveBeenCalledWith('open', 's1', 'ready');
});
