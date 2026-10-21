import { BOARD_LABEL } from '@/src/features/arena/model';
import type { ArenaBoardKind } from '@/src/lib/api/arena';
import type { AppNotification } from '@/src/lib/api/notifications';

const who = (n: AppNotification) => n.actor.name?.trim() || `@${n.actor.username}`;

/** The line shown for a notification. */
export function notificationText(n: AppNotification): string {
  switch (n.kind) {
    case 'friend_request': return `${who(n)} wants to be friends`;
    case 'friend_accepted': return `${who(n)} accepted — you’re friends now`;
    case 'overtaken': {
      const board = BOARD_LABEL[n.data.board as ArenaBoardKind] ?? 'the Arena';
      return `${who(n)} passed you on ${board} this week. Time to fight back?`;
    }
  }
}

/** Where tapping it goes. */
export function notificationTarget(n: AppNotification): string {
  switch (n.kind) {
    case 'friend_request': return '/friends?tab=requests';
    case 'friend_accepted': return '/friends';
    case 'overtaken': return `/arena?board=${n.data.board ?? 'grit'}`;
  }
}

/** "now", "5m", "3h", "2d", else "21 Oct". */
export function sinceLabel(iso: string, now = new Date()): string {
  const sec = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
