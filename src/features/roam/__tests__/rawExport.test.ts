import { RAW_TRACK_FORMAT, rawTrack } from '@/src/features/roam/rawExport';
import type { RecordingMeta } from '@/src/features/roam/recordingStore';

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));

it('exports every raw value the device recorded, ready for a truth distance', () => {
  const meta = { type: 'run', startedAtMs: Date.UTC(2026, 9, 18, 6) } as RecordingMeta;
  const track = rawTrack(meta, [[19.07, 72.87, 0, 5, 0, 2.4, 90, 12.5]]);
  expect(track).toMatchObject({
    format: RAW_TRACK_FORMAT,
    type: 'run',
    startedAt: '2026-10-18T06:00:00.000Z',
    points: [[19.07, 72.87, 0, 5, 0, 2.4, 90, 12.5]],
    truthM: null,
  });
  expect(track.platform).toMatch(/^(ios|android)/);
});
