import type { ArenaBoard, ArenaBoardKind, ArenaPeriod, ArenaRow } from '@/src/lib/api/arena';

export const BOARD_LABEL: Record<ArenaBoardKind, string> = { grit: 'Grit', stride: 'Stride', ride: 'Ride' };
export const PERIOD_LABEL: Record<ArenaPeriod, string> = { today: 'Today', week: 'This week', all: 'All time' };

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

/** The headline over a board: where the user stands. */
export function standing(b: ArenaBoard): string {
  const when = PERIOD_LABEL[b.period].toLowerCase();
  if (b.scope === 'global' && !b.me.listed) return 'Join Global to get ranked';
  if (b.me.rank == null) return b.period === 'all' ? `No ${BOARD_LABEL[b.board]} yet` : `No ${BOARD_LABEL[b.board]} yet ${when}`;
  return b.scope === 'friends' ? `#${b.me.rank} of ${b.rows.length}` : `#${b.me.rank.toLocaleString('en-US')} worldwide`;
}

/** What it takes to move up: "1.40 km behind @bo", "You’re leading", or null when unranked. */
export function nextUp(rows: ArenaRow[], board: ArenaBoardKind): string | null {
  const i = rows.findIndex((r) => r.me);
  if (i < 0 || rows[i].score <= 0) return null;
  const ahead = rows.slice(0, i).reverse().find((r) => r.score > rows[i].score);
  if (!ahead) return rows.length > 1 ? 'You’re leading' : null;
  return `${scoreText(board, ahead.score - rows[i].score)} behind @${ahead.user.username}`;
}
