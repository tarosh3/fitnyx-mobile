import type { ArenaBoard, ArenaBoardKind, ArenaPeriod, ArenaRow } from '@/src/lib/api/arena';

export const BOARD_LABEL: Record<ArenaBoardKind, string> = { grit: 'Grit', stride: 'Stride', ride: 'Ride' };
export const PERIOD_LABEL: Record<ArenaPeriod, string> = { today: 'Today', week: 'This week', all: 'All time' };

/** One line under the filters: how the board is scored. */
export const BOARD_HINT: Record<ArenaBoardKind, string> = {
  grit: 'Points for every set, hard set and personal best — effort, not weight.',
  stride: 'Kilometres you run or walk. Vehicle travel never counts.',
  ride: 'Kilometres you ride. Vehicle travel never counts.',
};

/** What earns points on a board, for the "nothing yet" state. */
export const BOARD_ACTION: Record<ArenaBoardKind, { label: string; href: string }> = {
  grit: { label: 'Start a workout', href: '/workouts' },
  stride: { label: 'Start a Stride', href: '/roam' },
  ride: { label: 'Start a Ride', href: '/roam' },
};

/** Grit as whole points; Stride / Ride metres as km (one decimal, two under 10 km). */
export function formatScore(board: ArenaBoardKind, score: number): { value: string; unit: string } {
  if (board === 'grit') return { value: Math.round(score).toLocaleString('en-US'), unit: 'Grit' };
  const km = score / 1000;
  return { value: km.toFixed(km < 10 ? 2 : 1), unit: 'km' };
}

const scoreText = (board: ArenaBoardKind, score: number) => {
  const { value, unit } = formatScore(board, score);
  return `${value} ${unit}`;
};

/**
 * The hero's big number and the words under it. `ranked` is false when there
 * is no rank to show: not on Global, or nothing in the period yet.
 */
export function heroRank(b: ArenaBoard): { rank: string; label: string; ranked: boolean } {
  if (b.scope === 'global' && !b.me.listed) return { rank: '—', label: 'Not on Global', ranked: false };
  // "#1 of 1" means nothing: with no friends on the board there is no rank yet.
  if (b.me.rank != null && isAlone(b)) return { rank: '—', label: 'Just you so far', ranked: false };
  if (b.me.rank == null) {
    const when = b.period === 'all' ? '' : ` ${PERIOD_LABEL[b.period].toLowerCase()}`;
    return { rank: '—', label: `No ${BOARD_LABEL[b.board]} yet${when}`, ranked: false };
  }
  if (b.scope === 'global') return { rank: `#${b.me.rank.toLocaleString('en-US')}`, label: 'worldwide', ranked: true };
  return { rank: `#${b.me.rank}`, label: `of ${b.rows.length} with friends`, ranked: true };
}

/** What it takes to move up: "1.40 km behind @bo", "You’re leading", or null when unranked / alone. */
export function nextUp(rows: ArenaRow[], board: ArenaBoardKind): string | null {
  const i = rows.findIndex((r) => r.me);
  if (i < 0 || rows[i].score <= 0) return null;
  const ahead = rows.slice(0, i).reverse().find((r) => r.score > rows[i].score);
  if (!ahead) return rows.length > 1 ? 'You’re leading' : null;
  return `${scoreText(board, ahead.score - rows[i].score)} behind @${ahead.user.username}`;
}

/** A friends board with nobody but the user on it. */
export const isAlone = (b: ArenaBoard) => b.scope === 'friends' && b.rows.every((r) => r.me);
