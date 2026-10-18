import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  activeElapsedMs,
  appendFixes,
  clearRecording,
  getRecording,
  getRecordingFor,
  loadPoints,
  pauseRecording,
  resumeRecording,
  startRecording,
  subscribe,
  uuidV4,
} from '@/src/features/roam/recordingStore';

const T0 = 1_760_000_000_000;
const fix = (sec: number, lat = 19.07, lng = 72.87, accuracy: number | null = 5) => ({
  lat,
  lng,
  timestampMs: T0 + sec * 1000,
  accuracy,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('recordingStore', () => {
  it('turns Android\'s since-boot step counter into steps since the start, across a reboot', async () => {
    await startRecording('walk', 'u1', T0);
    const stepsAt = async (counter: number | null, sec: number) => {
      await appendFixes([fix(sec)], { counter });
      const pts = await loadPoints();
      return pts[pts.length - 1][6];
    };
    expect(await stepsAt(null, 1)).toBe(-1); // no reading yet
    expect(await stepsAt(51_000, 2)).toBe(0); // first reading = 0 steps
    expect(await stepsAt(51_040, 4)).toBe(40);
    expect(await stepsAt(12, 6)).toBe(40); // rebooted: counter reset, steps carry on
    expect(await stepsAt(30, 8)).toBe(58);
  });

  it('persists fixes as [lat, lng, t, acc, segment, speed, steps, course, altitude] relative to the start', async () => {
    await startRecording('run', 'u1', T0);
    await appendFixes([
      { ...fix(0), speed: 2.345, course: 181.26, altitude: 215.44 },
      { ...fix(2.5), speed: -1, course: -1 },
      fix(5, 19.08, 72.88, null),
      fix(6, 19.08, 72.88, -1), // iOS: invalid fix — dropped
    ], { sinceStart: 12 });
    expect(await loadPoints()).toEqual([
      [19.07, 72.87, 0, 5, 0, 2.35, -1, 181.3, 215.4],
      [19.07, 72.87, 2.5, 5, 0, -1, -1, -1, null], // iOS: -1 = no speed / course
      [19.08, 72.88, 5, 0, 0, -1, 12, -1, null], // the step reading goes on the batch's last fix
    ]);
    expect((await getRecording())?.pointCount).toBe(3);
  });

  it('ignores fixes while paused and starts a new segment on resume', async () => {
    await startRecording('walk', 'u1', T0);
    await appendFixes([fix(1)]);
    await pauseRecording(T0 + 10_000);
    await appendFixes([fix(20)]); // late batch after pause — dropped
    await resumeRecording(T0 + 70_000);
    await appendFixes([fix(71)]);
    const pts = await loadPoints();
    expect(pts.map((p) => [p[2], p[4]])).toEqual([
      [1, 0],
      [71, 1],
    ]);
    const meta = (await getRecording())!;
    expect(meta.pausedTotalMs).toBe(60_000);
    expect(activeElapsedMs(meta, T0 + 100_000)).toBe(40_000);
  });

  it('spills into new chunks past 500 points without losing any', async () => {
    await startRecording('cycle', 'u1', T0);
    for (let batch = 0; batch < 3; batch++) {
      await appendFixes(Array.from({ length: 400 }, (_, i) => fix(batch * 400 + i)));
    }
    const pts = await loadPoints();
    expect(pts).toHaveLength(1200);
    expect(pts[1199][2]).toBe(1199);
    expect((await getRecording())?.chunkCount).toBe(3);
  });

  it('notifies subscribers and clears everything', async () => {
    const seen: number[] = [];
    const unsubscribe = subscribe((added) => seen.push(added.length));
    await startRecording('run', 'u1', T0);
    await appendFixes([fix(1), fix(2)]);
    unsubscribe();
    expect(seen).toEqual([2]);
    await clearRecording();
    expect(await getRecording()).toBeNull();
    expect(await loadPoints()).toEqual([]);
  });

  it('is scoped to the account that started it', async () => {
    await startRecording('run', 'u1', T0);
    await appendFixes([fix(1), fix(2)]);
    // Same user (e.g. after a forced sign-out and back in): still there.
    expect((await getRecordingFor('u1'))?.pointCount).toBe(2);
    // Auth still restoring: hidden but NOT deleted.
    expect(await getRecordingFor(null)).toBeNull();
    expect(await getRecording()).not.toBeNull();
    // A different account: discarded, nothing leaks.
    expect(await getRecordingFor('u2')).toBeNull();
    expect(await getRecording()).toBeNull();
    expect(await loadPoints()).toEqual([]);
  });

  it('generates RFC 4122 v4 UUIDs (the backend validates the format)', () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
