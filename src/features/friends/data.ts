import { useCallback, useEffect, useState } from 'react';

import { useCachedResource } from '@/src/features/workouts/hooks';
import {
  acceptFriendRequest, blockUser, cancelFriendRequest, declineFriendRequest, getBlockedUsers, getFriendRequests,
  getFriends, removeFriend, searchUsers, sendFriendRequest, unblockUser,
  type FriendSearchResult, type FriendsList, type FriendUser, type Relationship,
} from '@/src/lib/api/friends';
import { cacheKeys, cacheTTL } from '@/src/lib/cache';
import { isDefinitelyOffline } from '@/src/lib/network';
import { useAuth } from '@/src/providers/AuthProvider';
import { friendErrorMessage, normalizeSearch, relationshipAfter, type FriendChange } from './model';

/** GET /friends: last saved copy at once (also offline), refreshed on focus. */
export function useFriends() {
  const { user } = useAuth();
  return useCachedResource<FriendsList>(user ? cacheKeys.friends(user.id) : null, getFriends, cacheTTL.LONG);
}

export function useFriendRequests(direction: 'incoming' | 'outgoing') {
  const { user } = useAuth();
  return useCachedResource<FriendUser[]>(
    user ? cacheKeys.friendRequests(user.id, direction) : null,
    () => getFriendRequests(direction),
    cacheTTL.LONG,
  );
}

/** Blocked accounts — loaded only when asked for (the blocked list sheet). */
export function useBlockedUsers(open: boolean) {
  const [users, setUsers] = useState<FriendUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setUsers(await getBlockedUsers());
      setError(null);
    } catch (e) {
      setError(friendErrorMessage(e));
    }
  }, []);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  return { users, error, reload: load };
}

const SEARCH_DEBOUNCE_MS = 300;

/** Username search as the user types: debounced, latest query wins. */
export function useUserSearch(query: string) {
  const q = normalizeSearch(query);
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsers(q);
        if (alive) {
          setResults(found);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(friendErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  /** Shows a change on a result without searching again. */
  const setRelationship = useCallback((id: string, relationship: Relationship) => {
    setResults((rs) => rs.map((r) => (r.id === id ? { ...r, relationship } : r)));
  }, []);

  return { query: q, results, loading, error, setRelationship };
}

/** Makes a change and returns the new relationship; throws an Error with user-facing text. */
export async function applyFriendChange(change: FriendChange, userId: string): Promise<Relationship> {
  if (await isDefinitelyOffline()) throw new Error(friendErrorMessage(new Error('offline')));
  try {
    switch (change) {
      case 'send': return relationshipAfter('send', await sendFriendRequest(userId));
      case 'accept': await acceptFriendRequest(userId); break;
      case 'decline': await declineFriendRequest(userId); break;
      case 'cancel': await cancelFriendRequest(userId); break;
      case 'remove': await removeFriend(userId); break;
      case 'block': await blockUser(userId); break;
      case 'unblock': await unblockUser(userId); break;
    }
    return relationshipAfter(change);
  } catch (e) {
    throw new Error(friendErrorMessage(e));
  }
}
