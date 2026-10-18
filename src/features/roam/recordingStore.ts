import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ActivityType, RoamPoint } from '@/src/features/roam/geo';

// The in-progress Roam lives in AsyncStorage, not memory: the background
// location task can run while the UI is gone (screen locked, app swiped away
// on Android), and a crash mid-run must not lose the track. Points are stored
// in fixed-size chunks so each new batch rewrites only the last chunk.

const KEYS = {
  meta: 'fitnyx-roam:recording',
  chunk: (i: number) => `fitnyx-roam:points:${i}`,
} as const;

const CHUNK_SIZE = 500;

export interface RecordingMeta {
  clientId: string;
  /** Account that started it — a recording never surfaces for anyone else. */
  userId: string | null;
  type: ActivityType;
  startedAtMs: number;
  status: 'recording' | 'paused';
  /** Increments on every resume; distance is never counted across a pause. */
  segment: number;
  pausedAtMs: number | null;
  pausedTotalMs: number;
  /** Active windows let delayed GPS batches skip native background pauses. */
  segments?: { startMs: number; endMs?: number }[];
  finishedAtMs?: number;
  chunkCount: number;
  pointCount: number;
  /** Android step counter (counts since boot) at "0 steps"; set on the first reading. */
  stepBase?: number;
  /** Last step count since the start, to carry on across a reboot (counter reset). */
  steps?: number;
}

/** A pedometer reading for a batch: iOS counts since the start, Android's counter since boot. */
export interface StepSample {
  sinceStart?: number | null;
  counter?: number | null;
}

type Listener = (points: RoamPoint[], meta: RecordingMeta) => void;
const listeners = new Set<Listener>();

// All writes go through one promise chain: the location task and UI actions
// (pause/resume) would otherwise interleave read-modify-write on the meta.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

/** RFC 4122 v4 UUID (unique per user is all that's needed; the backend validates the format). */
export function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getRecording(): Promise<RecordingMeta | null> {
  return readJson<RecordingMeta>(KEYS.meta);
}

/**
 * The recording if it belongs to userId. One left by a different account
 * (signed out without saving, someone else signed in) is discarded, so it
 * can't leak across accounts; a forced sign-out of the same user keeps it.
 */
export async function getRecordingFor(userId: string | null | undefined): Promise<RecordingMeta | null> {
  const meta = await getRecording();
  if (!meta || !userId) return null;
  if (meta.userId && meta.userId !== userId) {
    await clearRecording();
    return null;
  }
  return meta;
}

export function startRecording(type: ActivityType, userId: string | null, nowMs = Date.now()): Promise<RecordingMeta> {
  return serial(async () => {
    await clearChunks();
    const meta: RecordingMeta = {
      clientId: uuidV4(),
      userId,
      type,
      startedAtMs: nowMs,
      status: 'recording',
      segment: 0,
      segments: [{ startMs: nowMs }],
      pausedAtMs: null,
      pausedTotalMs: 0,
      chunkCount: 0,
      pointCount: 0,
    };
    await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
    return meta;
  });
}

/**
 * Appends fixes from the location task. Ignored unless recording (a late batch
 * after pause/finish must not leak in). Times are seconds since the start.
 */
export function appendFixes(
  fixes: {
    lat: number;
    lng: number;
    timestampMs: number;
    accuracy: number | null;
    speed?: number | null;
    course?: number | null;
    altitude?: number | null;
  }[],
  stepSample?: StepSample,
): Promise<void> {
  return serial(async () => {
    const meta = await getRecording();
    if (!meta || meta.status !== 'recording' || fixes.length === 0) return;
    const steps = stepsSinceStart(meta, stepSample);
    const pts: RoamPoint[] = fixes.flatMap((f): RoamPoint[] => {
      const windows = meta.segments;
      const segment = windows ? windows.findIndex((w) => f.timestampMs >= w.startMs && (w.endMs == null || f.timestampMs <= w.endMs)) : meta.segment;
      // Negative accuracy = iOS marking the fix invalid (the backend rejects it).
      if (segment < 0 || f.timestampMs < meta.startedAtMs || (f.accuracy != null && f.accuracy < 0)) return [];
      // GPS speed and course: iOS reports -1 and web null when unknown.
      const speed = f.speed != null && f.speed >= 0 ? Math.round(f.speed * 100) / 100 : -1;
      const course = f.course != null && f.course >= 0 ? Math.round(f.course * 10) / 10 : -1;
      const altitude = f.altitude != null && Number.isFinite(f.altitude) ? Math.round(f.altitude * 10) / 10 : null;
      const t = Math.round((f.timestampMs - meta.startedAtMs) / 100) / 10;
      return [[f.lat, f.lng, t, f.accuracy ?? 0, segment, speed, -1, course, altitude]];
    });
    if (pts.length === 0) return;
    pts[pts.length - 1][6] = steps; // the reading is "now": the batch's latest kept fix

    let last = meta.chunkCount > 0 ? ((await readJson<RoamPoint[]>(KEYS.chunk(meta.chunkCount - 1))) ?? []) : [];
    let chunkIndex = Math.max(meta.chunkCount - 1, 0);
    for (const p of pts) {
      if (last.length >= CHUNK_SIZE) {
        await AsyncStorage.setItem(KEYS.chunk(chunkIndex), JSON.stringify(last));
        chunkIndex++;
        last = [];
      }
      last.push(p);
    }
    await AsyncStorage.setItem(KEYS.chunk(chunkIndex), JSON.stringify(last));
    meta.chunkCount = chunkIndex + 1;
    meta.pointCount += pts.length;
    await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
    listeners.forEach((l) => l(pts, meta));
  });
}

/** Steps since the start from a reading (-1 unknown); keeps Android's baseline in `meta`. */
function stepsSinceStart(meta: RecordingMeta, sample?: StepSample): number {
  if (sample?.sinceStart != null && sample.sinceStart >= 0) return sample.sinceStart;
  const counter = sample?.counter;
  if (counter == null || counter < 0) return -1;
  // First reading, or the counter went backwards (phone rebooted): continue
  // from the last count instead of losing or double-counting steps.
  if (meta.stepBase == null || counter - meta.stepBase < (meta.steps ?? 0)) meta.stepBase = counter - (meta.steps ?? 0);
  meta.steps = counter - meta.stepBase;
  return meta.steps;
}

export async function loadPoints(): Promise<RoamPoint[]> {
  const meta = await getRecording();
  if (!meta) return [];
  const chunks = await Promise.all(
    Array.from({ length: meta.chunkCount }, (_, i) => readJson<RoamPoint[]>(KEYS.chunk(i))),
  );
  return chunks.flatMap((c) => c ?? []);
}

export function pauseRecording(nowMs = Date.now()): Promise<RecordingMeta | null> {
  return serial(async () => {
    const meta = await getRecording();
    if (!meta || meta.finishedAtMs || meta.status !== 'recording') return meta;
    if (meta.segments?.length) meta.segments[meta.segments.length - 1].endMs = nowMs;
    meta.status = 'paused';
    meta.pausedAtMs = nowMs;
    await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
    listeners.forEach((l) => l([], meta));
    return meta;
  });
}

export function resumeRecording(nowMs = Date.now()): Promise<RecordingMeta | null> {
  return serial(async () => {
    const meta = await getRecording();
    if (!meta || meta.finishedAtMs || meta.status !== 'paused') return meta;
    meta.pausedTotalMs += Math.max(0, nowMs - (meta.pausedAtMs ?? nowMs));
    meta.pausedAtMs = null;
    meta.status = 'recording';
    meta.segment += 1;
    meta.segments?.push({ startMs: nowMs });
    await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
    listeners.forEach((l) => l([], meta));
    return meta;
  });
}

/** Wall-clock time excluding pauses. */
export function activeElapsedMs(meta: RecordingMeta, nowMs = Date.now()): number {
  const pausedNow = meta.status === 'paused' && meta.pausedAtMs != null ? nowMs - meta.pausedAtMs : 0;
  return Math.max(0, nowMs - meta.startedAtMs - meta.pausedTotalMs - pausedNow);
}

async function clearChunks(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('fitnyx-roam:points:'));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

export function clearRecording(): Promise<void> {
  return serial(async () => {
    await clearChunks();
    await AsyncStorage.removeItem(KEYS.meta);
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Review is terminal for live controls, even if the app closes before saving. */
export function finishRecording(): Promise<RecordingMeta | null> {
  return serial(async () => {
    const meta = await getRecording();
    if (!meta) return null;
    const now = Date.now();
    if (meta.status === 'recording') {
      meta.status = 'paused';
      meta.pausedAtMs = now;
      if (meta.segments?.length) meta.segments[meta.segments.length - 1].endMs = now;
    }
    meta.finishedAtMs = now;
    await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
    listeners.forEach((listener) => listener([], meta));
    return meta;
  });
}
