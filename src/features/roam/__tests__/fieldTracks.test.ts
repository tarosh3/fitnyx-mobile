import fs from 'fs';
import path from 'path';

import { computeStats } from '@/src/features/roam/geo';
import { RAW_TRACK_FORMAT, type RawTrack } from '@/src/features/roam/rawExport';

// Real recordings with a known distance — the accuracy regression suite.
// How to add one: record a Roam on a phone, long-press "… COMPLETE" on the
// review screen to share the raw track, set `truthM` (e.g. 4000 for 10 laps of
// a 400 m track, 0 for a phone held still), and save it here. Optional
// `toleranceM` overrides the default (1% of the distance, at least 20 m).
// Good set: track laps, a measured road route, a shaken still phone, a ride —
// each on iPhone and Android, with Nike Run Club recording alongside.

const dir = path.join(__dirname, '..', '__fixtures__', 'field');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

type FieldTrack = RawTrack & { toleranceM?: number };

describe('field tracks (real recordings with a known distance)', () => {
  if (files.length === 0) {
    it.todo('add raw exports with truthM to src/features/roam/__fixtures__/field');
    return;
  }
  it.each(files)('%s', (file) => {
    const track = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as FieldTrack;
    expect(track.format).toBe(RAW_TRACK_FORMAT);
    expect(typeof track.truthM).toBe('number');
    const truth = track.truthM as number;
    const got = computeStats(track.points, track.type).distanceM;
    const tolerance = track.toleranceM ?? Math.max(20, truth * 0.01);
    expect(Math.abs(got - truth)).toBeLessThanOrEqual(tolerance);
  });
});
