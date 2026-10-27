import { collectRoutineVideoUrls } from '@/src/lib/offline/mediaPrefetch';
import type { Routine } from '@/src/lib/api/routines';

const routine = (urls: (string | undefined)[]): Routine =>
  ({
    id: 'r', title: 'R', day_id: 'd', last_done: null, created_at: '', updated_at: '',
    exercises: urls.map((u, i) => ({
      id: `e${i}`, day_id: 'd', exercise_uuid: `u${i}`, exercise_order: i, created_at: '',
      exercise: u === undefined ? undefined : ({ uuid: `u${i}`, video_url: u } as never),
    })),
  }) as unknown as Routine;

describe('collectRoutineVideoUrls', () => {
  it('returns the distinct .mp4 videos across routines', () => {
    const out = collectRoutineVideoUrls([
      routine(['https://cdn/a.mp4', 'https://cdn/b.mp4']),
      routine(['https://cdn/b.mp4', 'https://cdn/c.mp4']),
    ]);
    expect(out.sort()).toEqual(['https://cdn/a.mp4', 'https://cdn/b.mp4', 'https://cdn/c.mp4']);
  });

  it('skips non-mp4, blank and missing videos', () => {
    const out = collectRoutineVideoUrls([
      routine(['https://cdn/a.mp4', 'https://cdn/poster.gif', '', '   ', undefined]),
    ]);
    expect(out).toEqual(['https://cdn/a.mp4']);
  });

  it('is case-insensitive on the extension and trims', () => {
    const out = collectRoutineVideoUrls([routine([' https://cdn/A.MP4 '])]);
    expect(out).toEqual(['https://cdn/A.MP4']);
  });

  it('handles empty input', () => {
    expect(collectRoutineVideoUrls([])).toEqual([]);
    expect(collectRoutineVideoUrls(undefined as never)).toEqual([]);
  });
});
