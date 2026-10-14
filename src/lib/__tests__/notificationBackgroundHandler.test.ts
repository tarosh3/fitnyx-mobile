import notifee, { EventType, type Event } from '@notifee/react-native';

import { getActiveSession, type WorkoutSession } from '@/src/lib/api/workoutSessions';
import { offlinePauseSession, offlineResumeSession } from '@/src/lib/offline/offlineApi';
import { getActiveOfflineSessionId, getOfflineSession, resolveId } from '@/src/lib/offline/offlineStore';
import { dismiss, rememberOpenRequest, showActiveWorkout } from '@/src/lib/workoutNotification';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { onBackgroundEvent: jest.fn() },
  EventType: { ACTION_PRESS: 1, PRESS: 2, DISMISSED: 3 },
}));
jest.mock('@/src/lib/api', () => ({
  isAuthError: (error: { isAuthError?: boolean } | null) => error?.isAuthError === true,
}));
jest.mock('@/src/lib/api/workoutSessions', () => ({ getActiveSession: jest.fn() }));
jest.mock('@/src/lib/offline/offlineApi', () => ({ offlinePauseSession: jest.fn(), offlineResumeSession: jest.fn() }));
jest.mock('@/src/lib/offline/offlineStore', () => ({
  getActiveOfflineSessionId: jest.fn(), getOfflineSession: jest.fn(), resolveId: jest.fn(),
  isOfflineId: (id: string) => id.startsWith('offline-'),
}));
jest.mock('@/src/lib/workoutNotification', () => ({
  NOTIFICATION_ID: 'active-workout', dismiss: jest.fn(), rememberOpenRequest: jest.fn(), showActiveWorkout: jest.fn(),
}));

import '../notificationBackgroundHandler';

const handle = jest.mocked(notifee.onBackgroundEvent).mock.calls[0][0];
const running: WorkoutSession = {
  id: 'session-1', user_id: 'user-1', status: 'in_progress', total_duration_sec: 120,
  workout_date: '2026-10-14', started_at: '2026-10-14T08:00:00Z',
  last_resumed_at: '2026-10-14T08:02:00Z', created_at: '2026-10-14T08:00:00Z',
};
const paused: WorkoutSession = { ...running, status: 'paused', total_duration_sec: 185, paused_at: '2026-10-14T08:03:05Z' };
const ready: WorkoutSession = { ...paused, total_duration_sec: 0 };

function event(action = 'pause', state = 'running', sessionId = running.id): Event {
  return {
    type: EventType.ACTION_PRESS,
    detail: { pressAction: { id: action }, notification: { id: 'active-workout', data: { sessionId, workoutState: state } } },
  };
}

describe('background workout notification actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(resolveId).mockImplementation(async (id) => id);
    jest.mocked(getActiveSession).mockResolvedValue({ active: true, session: running });
    jest.mocked(getActiveOfflineSessionId).mockResolvedValue(null);
    jest.mocked(getOfflineSession).mockResolvedValue(null);
    jest.mocked(offlinePauseSession).mockResolvedValue(paused);
    jest.mocked(offlineResumeSession).mockResolvedValue(running);
  });
  afterEach(() => jest.restoreAllMocks());

  it('pauses with the offline-aware helper and displays confirmed accumulated time', async () => {
    await handle(event());

    expect(offlinePauseSession).toHaveBeenCalledWith(running.id);
    expect(showActiveWorkout).toHaveBeenCalledWith(paused);
    expect(showActiveWorkout).not.toHaveBeenCalledWith(running);
    expect(offlineResumeSession).not.toHaveBeenCalled();
  });

  it.each([
    ['ready', ready], ['paused', paused],
  ] as const)('starts or resumes only after an explicit %s action', async (state, session) => {
    jest.mocked(getActiveSession).mockResolvedValue({ active: true, session });
    await handle(event('resume', state));

    expect(offlineResumeSession).toHaveBeenCalledWith(session.id);
    expect(showActiveWorkout).toHaveBeenCalledWith(running);
    expect(offlinePauseSession).not.toHaveBeenCalled();
  });

  it('uses the active persisted session when the network is unavailable', async () => {
    jest.mocked(getActiveSession).mockRejectedValue(new TypeError('Network request failed'));
    jest.mocked(getActiveOfflineSessionId).mockResolvedValue(running.id);
    jest.mocked(getOfflineSession).mockResolvedValue(running);

    await handle(event());

    expect(getOfflineSession).toHaveBeenCalledWith(running.id);
    expect(offlinePauseSession).toHaveBeenCalledWith(running.id);
    expect(showActiveWorkout).toHaveBeenCalledWith(paused);
  });

  it.each([
    { status: 401 }, { status: 500 }, { isAuthError: true },
  ])('does not fall back to persisted data for HTTP/auth failure %j', async (error) => {
    jest.mocked(getActiveSession).mockRejectedValue(error);
    await handle(event());

    expect(getActiveOfflineSessionId).not.toHaveBeenCalled();
    expect(getOfflineSession).not.toHaveBeenCalled();
    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it.each([
    ['pause', 'running', paused],
    ['resume', 'paused', running],
    ['resume', 'ready', paused],
  ] as const)('refreshes stale %s/%s controls without changing the session', async (action, state, session) => {
    jest.mocked(getActiveSession).mockResolvedValue({ active: true, session });
    await handle(event(action, state));

    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(offlineResumeSession).not.toHaveBeenCalled();
    expect(showActiveWorkout).toHaveBeenCalledWith(session);
  });

  it('ignores an action for a different workout without dismissing the current notification', async () => {
    await handle(event('pause', 'running', 'old-session'));

    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(showActiveWorkout).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('dismisses an ended workout without resurrecting the persisted copy', async () => {
    jest.mocked(getActiveSession).mockResolvedValue({ active: false, session: null });
    jest.mocked(getActiveOfflineSessionId).mockResolvedValue(running.id);
    jest.mocked(getOfflineSession).mockResolvedValue(running);
    await handle(event());

    expect(getOfflineSession).not.toHaveBeenCalled();
    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss a newer locally active session when the server has no session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue({ active: false, session: null });
    jest.mocked(getActiveOfflineSessionId).mockResolvedValue('offline-new-session');
    await handle(event());

    expect(dismiss).not.toHaveBeenCalled();
    expect(offlinePauseSession).not.toHaveBeenCalled();
  });

  it('does not act on a completed persisted session while offline', async () => {
    jest.mocked(getActiveSession).mockRejectedValue(new TypeError('Network request failed'));
    jest.mocked(getActiveOfflineSessionId).mockResolvedValue(running.id);
    jest.mocked(getOfflineSession).mockResolvedValue({ ...running, status: 'completed' });
    await handle(event());

    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it.each(['finish', 'delete', 'default'])('ignores unsupported action %s', async (action) => {
    await handle(event(action));
    expect(getActiveSession).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('rejects unrelated notifications, missing identity, and incompatible action state', async () => {
    const unrelated = event();
    unrelated.detail.notification!.id = 'water-reminder';
    const missing = event();
    missing.detail.notification!.data = { workoutState: 'running' };
    await handle(unrelated);
    await handle(missing);
    await handle(event('pause', 'ready'));
    await handle(event('resume', 'running'));
    await handle(event('pause', 'unknown'));

    expect(getActiveSession).not.toHaveBeenCalled();
    expect(offlinePauseSession).not.toHaveBeenCalled();
    expect(offlineResumeSession).not.toHaveBeenCalled();
  });

  it.each([EventType.PRESS, EventType.ACTION_PRESS])('defers open event %s to foreground without starting the timer', async (type) => {
    const open = event('open', 'ready');
    open.type = type;
    await handle(open);

    expect(rememberOpenRequest).toHaveBeenCalledWith(running.id);
    expect(getActiveSession).not.toHaveBeenCalled();
    expect(offlineResumeSession).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous actions including an offline ID promoted to the same session', async () => {
    jest.mocked(resolveId).mockImplementation(async (id) => id === 'offline-old-id' ? running.id : id);
    let release!: (value: WorkoutSession) => void;
    jest.mocked(offlinePauseSession).mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const first = handle(event());
    // Let the first action reach its pending mutation before dispatching the second.
    for (let i = 0; i < 8 && !release; i += 1) await Promise.resolve();
    expect(release).toBeDefined();
    await handle(event('pause', 'running', 'offline-old-id'));
    expect(offlinePauseSession).toHaveBeenCalledTimes(1);

    release(paused);
    await first;
    expect(showActiveWorkout).toHaveBeenCalledTimes(1);
  });

  it('allows a later retry after a failed action', async () => {
    jest.mocked(offlinePauseSession).mockRejectedValueOnce({ status: 503 });
    await handle(event());
    await handle(event());

    expect(offlinePauseSession).toHaveBeenCalledTimes(2);
    expect(showActiveWorkout).toHaveBeenCalledTimes(1);
    expect(showActiveWorkout).toHaveBeenCalledWith(paused);
  });
});
