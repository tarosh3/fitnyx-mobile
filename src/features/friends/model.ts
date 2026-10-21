import type { FriendErrorCode, FriendUser, Relationship } from '@/src/lib/api/friends';

/** What tapping a search result's button does, by relationship. */
export type FriendAction = 'send' | 'cancel' | 'accept' | 'unblock';
/** Every change the friends screens can make. */
export type FriendChange = FriendAction | 'decline' | 'remove' | 'block';

export interface RelationshipButton {
  label: string;
  /** null = a label only (already friends). */
  action: FriendAction | null;
  primary: boolean;
}

export function relationshipButton(rel: Relationship): RelationshipButton {
  switch (rel) {
    case 'friends': return { label: 'Friends', action: null, primary: false };
    case 'request_sent': return { label: 'Requested', action: 'cancel', primary: false };
    case 'request_received': return { label: 'Accept', action: 'accept', primary: true };
    case 'blocked': return { label: 'Unblock', action: 'unblock', primary: false };
    default: return { label: 'Add', action: 'send', primary: true };
  }
}

/** The relationship after a change succeeded. `send` can come back as friends (they had asked). */
export function relationshipAfter(change: FriendChange, sent?: Relationship): Relationship {
  switch (change) {
    case 'send': return sent ?? 'request_sent';
    case 'accept': return 'friends';
    case 'block': return 'blocked';
    default: return 'none';
  }
}

const USERNAME_FRAGMENT = /^[a-z0-9._]{1,30}$/;

/** "@Kapil " → "kapil"; '' when it can't be part of a username (no request is sent). Same rule as the backend. */
export function normalizeSearch(query: string): string {
  const q = query.trim().replace(/^@/, '').toLowerCase();
  return USERNAME_FRAGMENT.test(q) ? q : '';
}

/** A friend's name, else their @handle. */
export function displayName(u: Pick<FriendUser, 'name' | 'username'>): string {
  return u.name?.trim() || `@${u.username}`;
}

const MESSAGES: Record<FriendErrorCode, string> = {
  SELF: 'That’s you!',
  NOT_FOUND: 'This account isn’t available.',
  REQUEST_NOT_FOUND: 'That request was withdrawn.',
  NO_USERNAME: 'Pick a username first.',
  BLOCKED: 'You blocked this account. Unblock it first.',
  FRIEND_LIMIT: 'You’ve reached 1,000 friends — remove some to add more.',
  THEIR_FRIEND_LIMIT: 'They’ve reached the friend limit.',
  TOO_MANY_REQUESTS: 'You have too many pending requests. Cancel some first.',
};

/** User-facing text for a failed friends call. No status = no connection. */
export function friendErrorMessage(error: unknown): string {
  const e = error as { status?: number; code?: string };
  if (!e?.status) return 'You’re offline. Try again when you’re connected.';
  if (e.code && e.code in MESSAGES) return MESSAGES[e.code as FriendErrorCode];
  if (e.status === 429) return 'Slow down a little — try again in a while.';
  return 'Something went wrong. Try again.';
}

/** The confirmation shown after a change; null = none. */
export function changeMessage(change: FriendChange, result: Relationship, username: string): string | null {
  const who = `@${username}`;
  if (result === 'friends') return `You and ${who} are now friends`;
  switch (change) {
    case 'send': return `Request sent to ${who}`;
    case 'cancel': return 'Request cancelled';
    case 'remove': return `Removed ${who} from friends`;
    case 'block': return `Blocked ${who}`;
    case 'unblock': return `Unblocked ${who}`;
    default: return null;
  }
}
