const mockFetchWithAuth = jest.fn(async (..._a: unknown[]) => ({}));
jest.mock('@/src/lib/api', () => ({ fetchWithAuth: (...a: unknown[]) => mockFetchWithAuth(...a) }));

import { localDateKey, sessionAction } from '@/src/lib/api/workoutSessions';

const sentBody = () => JSON.parse((mockFetchWithAuth.mock.calls[0][1] as { body: string }).body);

describe('localDateKey', () => {
  it('uses the device-local calendar date', () => {
    const d = new Date(2026, 9, 8, 0, 30); // local 00:30, Oct 8
    expect(localDateKey(d)).toBe('2026-10-08');
  });
});

describe('sessionAction workout_date', () => {
  beforeEach(() => mockFetchWithAuth.mockClear());

  it('sends the local date of startedAt on start', async () => {
    const started = new Date(2026, 9, 8, 5, 0); // local 05:00
    await sessionAction('start', { planId: 'p', dayId: 'd', startedAt: started.toISOString() });
    expect(sentBody().workout_date).toBe('2026-10-08');
  });

  it('omits workout_date for non-start actions', async () => {
    await sessionAction('finish', { sessionId: 's' });
    expect(sentBody().workout_date).toBeUndefined();
  });
});
