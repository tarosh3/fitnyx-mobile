import type { ArenaBoard, ArenaRow } from '@/src/lib/api/arena';
import { formatScore, nextUp, standing } from '../model';

const row = (username: string, score: number, rank: number, me = false): ArenaRow =>
  ({ rank, score, me, user: { id: username, username, name: null, avatar_url: '' } });

const board = (over: Partial<ArenaBoard>): ArenaBoard => ({
  board: 'grit', scope: 'friends', period: 'week', from: '2026-10-19', to: '2026-10-25', rows: [],
  me: { rank: null, score: 0, listed: false }, ...over,
});

describe('Arena model', () => {
  it('formats scores', () => {
    expect(formatScore('grit', 1240)).toEqual({ value: '1,240', unit: 'Grit' });
    expect(formatScore('stride', 5230)).toEqual({ value: '5.23', unit: 'km' });
    expect(formatScore('ride', 42195)).toEqual({ value: '42.2', unit: 'km' });
  });

  it('says where the user stands', () => {
    const rows = [row('anya', 300, 1), row('me', 120, 2, true), row('cy', 0, 3)];
    expect(standing(board({ rows, me: { rank: 2, score: 120, listed: false } }))).toBe('#2 of 3');
    expect(standing(board({ scope: 'global', me: { rank: 1234, score: 1, listed: true } }))).toBe('#1,234 worldwide');
    expect(standing(board({ scope: 'global', me: { rank: null, score: 500, listed: false } }))).toBe('Join Global to get ranked');
    expect(standing(board({ board: 'stride', period: 'today' }))).toBe('No Stride yet today');
    expect(standing(board({ period: 'all' }))).toBe('No Grit yet');
  });

  it('shows the gap to the next person up', () => {
    expect(nextUp([row('anya', 300, 1), row('me', 120, 2, true)], 'grit')).toBe('180 Grit behind @anya');
    // A tie above doesn't count as ahead; the next higher score does.
    expect(nextUp([row('anya', 6400, 1), row('bo', 5000, 2), row('me', 5000, 2, true)], 'stride')).toBe('1.40 km behind @anya');
    expect(nextUp([row('me', 300, 1, true), row('bo', 100, 2)], 'grit')).toBe('You’re leading');
    expect(nextUp([row('me', 0, 1, true)], 'grit')).toBeNull();
    expect(nextUp([row('anya', 10, 1)], 'grit')).toBeNull();
  });
});
