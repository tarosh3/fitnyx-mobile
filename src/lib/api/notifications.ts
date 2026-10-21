import { fetchWithAuth } from '@/src/lib/api';
import type { FriendUser } from '@/src/lib/api/friends';

// Mirrors backend internal/handlers/notification_handler.go.

export type NotificationKind = 'friend_request' | 'friend_accepted' | 'overtaken';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** A friend, or someone who sent a request — so `name` is set when they have one. */
  actor: FriendUser;
  /** overtaken: { board: 'grit' | 'stride' | 'ride', period: 'w<monday>' }. */
  data: Record<string, string>;
  created_at: string;
  read: boolean;
}

export interface NotificationList {
  notifications: AppNotification[];
  unread_count: number;
}

export async function getNotifications(): Promise<NotificationList> {
  return fetchWithAuth('/notifications');
}

export async function markNotificationsRead(): Promise<void> {
  await fetchWithAuth('/notifications/read', { method: 'POST' });
}
