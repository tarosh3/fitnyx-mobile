import { usernameLockedLabel, usernameLockedUntil } from '../usernameLimit';

const now = new Date('2026-10-20T12:00:00Z');

it('locks for 24 hours after a change made after onboarding', () => {
  const until = usernameLockedUntil({ onboarding_complete: true, username_changed_at: '2026-10-20T07:00:00Z' }, now);
  expect(until?.toISOString()).toBe('2026-10-21T07:00:00.000Z');
  expect(usernameLockedLabel(until!, now)).toBe('You can change your username once a day. Next change in 19 hours.');
});

it('is open when never changed, during onboarding, or after 24 hours', () => {
  expect(usernameLockedUntil({ onboarding_complete: true, username_changed_at: null }, now)).toBeNull();
  expect(usernameLockedUntil({ onboarding_complete: false, username_changed_at: '2026-10-20T11:00:00Z' }, now)).toBeNull();
  expect(usernameLockedUntil({ onboarding_complete: true, username_changed_at: '2026-10-19T11:59:00Z' }, now)).toBeNull();
  expect(usernameLockedUntil(null, now)).toBeNull();
});

it('says 1 hour for the last minutes', () => {
  expect(usernameLockedLabel(new Date('2026-10-20T12:10:00Z'), now)).toBe('You can change your username once a day. Next change in 1 hour.');
});
