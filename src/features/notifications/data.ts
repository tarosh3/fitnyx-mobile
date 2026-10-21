import { useCallback } from 'react';

import { useCachedResource } from '@/src/features/workouts/hooks';
import { getNotifications, markNotificationsRead, type NotificationList } from '@/src/lib/api/notifications';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';

/** GET /notifications: last copy at once (also offline), refreshed on focus — the bell and the list share it. */
export function useNotifications() {
  const { user } = useAuth();
  const resource = useCachedResource<NotificationList>(user ? cacheKeys.notifications(user.id) : null, getNotifications, cacheTTL.SHORT);
  const { data, setData, refresh } = resource;

  /**
   * Clears the badge at once, then tells the server and reloads — the focus
   * refresh may still be in flight with the old unread count. A failure just
   * leaves them unread on the server.
   */
  const markAllRead = useCallback(() => {
    if (!data || data.unread_count === 0) return;
    setData({ unread_count: 0, notifications: data.notifications.map((n) => ({ ...n, read: true })) });
    markNotificationsRead().then(refresh, () => undefined);
  }, [data, setData, refresh]);

  return { ...resource, markAllRead };
}
