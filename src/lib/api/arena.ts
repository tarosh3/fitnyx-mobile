import { fetchWithAuth } from '@/src/lib/api';
import type { FriendUser } from '@/src/lib/api/friends';

// Mirrors backend internal/handlers/arena_handler.go.

export type ArenaBoardKind = 'grit' | 'stride' | 'ride';
export type ArenaScope = 'friends' | 'global';
export type ArenaPeriod = 'today' | 'week' | 'all';

export interface ArenaRow {
  rank: number;
  /** `name` is null for strangers on a global board. */
  user: FriendUser;
  /** Grit points, or metres for Stride / Ride. */
  score: number;
  me: boolean;
}

export interface ArenaBoard {
  board: ArenaBoardKind;
  scope: ArenaScope;
  period: ArenaPeriod;
  /** First and last local date covered; null for all-time. */
  from: string | null;
  to: string | null;
  rows: ArenaRow[];
  me: {
    /** null = not ranked: nothing in the period, or not opted in to a global board. */
    rank: number | null;
    score: number;
    /** Shown on global boards (the user's choice). */
    listed: boolean;
  };
}

/** `date` is the user's local date (YYYY-MM-DD) — "today" and "this week" are theirs. */
export async function getArenaBoard(board: ArenaBoardKind, scope: ArenaScope, period: ArenaPeriod, date: string): Promise<ArenaBoard> {
  return fetchWithAuth(`/arena?board=${board}&scope=${scope}&period=${period}&date=${date}`);
}

export async function getArenaSettings(): Promise<{ public: boolean }> {
  return fetchWithAuth('/arena/settings');
}

/** Show (or stop showing) the user on global boards. */
export async function setArenaPublic(value: boolean): Promise<{ public: boolean }> {
  return fetchWithAuth('/arena/settings', { method: 'PUT', body: JSON.stringify({ public: value }) });
}
