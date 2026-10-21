import type { AppNotification } from '@/src/lib/api/notifications';
import { notificationTarget, notificationText, sinceLabel } from '../model';

const note = (over: Partial<AppNotification>): AppNotification => ({
  id: '1', kind: 'friend_request', actor: { id: 'a', username: 'kapil', name: 'Kapil Sharma', avatar_url: '' },
  data: {}, created_at: '2026-10-22T10:00:00Z', read: false, ...over,
});

describe('notifications model', () => {
  it('words each kind and knows where it leads', () => {
    expect(notificationText(note({}))).toBe('Kapil Sharma wants to be friends');
    expect(notificationTarget(note({}))).toBe('/friends?tab=requests');
    expect(notificationText(note({ kind: 'friend_accepted', actor: { id: 'a', username: 'kapil', name: null, avatar_url: '' } })))
      .toBe('@kapil accepted — you’re friends now');
    const passed = note({ kind: 'overtaken', data: { board: 'stride', period: 'w2026-10-19' } });
    expect(notificationText(passed)).toBe('Kapil Sharma passed you on Stride this week. Time to fight back?');
    expect(notificationTarget(passed)).toBe('/arena?board=stride');
  });

  it('labels how long ago', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(sinceLabel('2026-10-22T11:59:30Z', now)).toBe('now');
    expect(sinceLabel('2026-10-22T11:55:00Z', now)).toBe('5m');
    expect(sinceLabel('2026-10-22T09:00:00Z', now)).toBe('3h');
    expect(sinceLabel('2026-10-20T12:00:00Z', now)).toBe('2d');
    expect(sinceLabel('2026-10-01T12:00:00Z', now)).toBe('1 Oct');
  });
});
