jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {},
  AlarmType: {}, AndroidImportance: {}, AndroidNotificationSetting: {}, AndroidVisibility: {},
  AuthorizationStatus: {}, RepeatFrequency: {}, TriggerType: {},
}));

import { describeSchedule, nextWeekdayOccurrence } from '@/src/lib/reminders';

describe('nextWeekdayOccurrence', () => {
  // Tuesday 20 Oct 2026, 10:00 local time
  const from = new Date(2026, 9, 20, 10, 0, 0);

  it('finds the next matching weekday at the given time', () => {
    const next = nextWeekdayOccurrence(5, 7, 0, from); // Friday 07:00
    expect([next.getDay(), next.getDate(), next.getHours(), next.getMinutes()]).toEqual([5, 23, 7, 0]);
  });

  it('uses today when the time is still ahead, next week when it has passed', () => {
    expect(nextWeekdayOccurrence(2, 18, 30, from).getDate()).toBe(20);
    expect(nextWeekdayOccurrence(2, 7, 0, from).getDate()).toBe(27);
  });

  it('wraps from Saturday to Sunday', () => {
    const sat = new Date(2026, 9, 24, 12, 0, 0);
    const next = nextWeekdayOccurrence(0, 9, 0, sat);
    expect([next.getDay(), next.getDate()]).toEqual([0, 25]);
  });
});

describe('describeSchedule', () => {
  it('lists the days of a weekday reminder, Monday first', () => {
    expect(describeSchedule({ kind: 'daily', hour: 7, minute: 0, days: [5, 1, 3] })).toBe('Mon, Wed, Fri · 07:00');
    expect(describeSchedule({ kind: 'daily', hour: 18, minute: 30, days: [0] })).toBe('Sun · 18:30');
  });

  it('keeps "Daily" without days or with all seven', () => {
    expect(describeSchedule({ kind: 'daily', hour: 8, minute: 5 })).toBe('Daily · 08:05');
    expect(describeSchedule({ kind: 'daily', hour: 8, minute: 5, days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Daily · 08:05');
  });
});
