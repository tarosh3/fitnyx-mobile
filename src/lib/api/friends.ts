import { fetchWithAuth } from '@/src/lib/api';

// Mirrors backend internal/handlers/friend_handler.go.

/** How the signed-in user stands with someone. `blocked` = the user blocked them. */
export type Relationship = 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';

export interface FriendUser {
  id: string;
  username: string;
  /** Shown only to friends and to people they sent a request to; null otherwise. */
  name: string | null;
  avatar_url: string;
  /** When the friendship / request / block was made (absent in search results). */
  since?: string;
}

export interface FriendSearchResult extends FriendUser {
  relationship: Relationship;
}

export interface FriendsList {
  friends: FriendUser[];
  incoming_count: number;
}

/** Error codes the backend sends with 4xx answers. */
export type FriendErrorCode =
  | 'SELF' | 'NOT_FOUND' | 'REQUEST_NOT_FOUND' | 'NO_USERNAME' | 'BLOCKED'
  | 'FRIEND_LIMIT' | 'THEIR_FRIEND_LIMIT' | 'TOO_MANY_REQUESTS';

export async function getFriends(): Promise<FriendsList> {
  return fetchWithAuth('/friends');
}

export async function getFriendRequests(direction: 'incoming' | 'outgoing'): Promise<FriendUser[]> {
  const res: { requests: FriendUser[] } = await fetchWithAuth(`/friends/requests?direction=${direction}`);
  return res.requests;
}

/** Username prefix search (max 20); a leading @ is fine. */
export async function searchUsers(query: string): Promise<FriendSearchResult[]> {
  const res: { users: FriendSearchResult[] } = await fetchWithAuth(`/friends/search?q=${encodeURIComponent(query)}`);
  return res.users;
}

/** Returns `friends` when they had already asked (asking back accepts). */
export async function sendFriendRequest(userId: string): Promise<Relationship> {
  const res: { relationship: Relationship } = await fetchWithAuth('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  return res.relationship;
}

export async function acceptFriendRequest(userId: string): Promise<void> {
  await fetchWithAuth(`/friends/requests/${userId}/accept`, { method: 'POST' });
}

export async function declineFriendRequest(userId: string): Promise<void> {
  await fetchWithAuth(`/friends/requests/${userId}/decline`, { method: 'POST' });
}

/** Cancels the user's own pending request. */
export async function cancelFriendRequest(userId: string): Promise<void> {
  await fetchWithAuth(`/friends/requests/${userId}`, { method: 'DELETE' });
}

export async function removeFriend(userId: string): Promise<void> {
  await fetchWithAuth(`/friends/${userId}`, { method: 'DELETE' });
}

export async function getBlockedUsers(): Promise<FriendUser[]> {
  const res: { users: FriendUser[] } = await fetchWithAuth('/friends/blocks');
  return res.users;
}

/** Also ends any friendship or request between the two. */
export async function blockUser(userId: string): Promise<void> {
  await fetchWithAuth('/friends/blocks', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
}

export async function unblockUser(userId: string): Promise<void> {
  await fetchWithAuth(`/friends/blocks/${userId}`, { method: 'DELETE' });
}
