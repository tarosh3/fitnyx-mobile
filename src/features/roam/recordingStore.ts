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
  type: ActivityType;
  startedAtMs: number;
  status: 'recording' | 'paused';
  /** Increments on every resume; distance is never counted across a pause. */
  segment: number;
  pausedAtMs: number | null;
  pausedTotalMs: number;
  chunkCount: number;
  pointCount: number;
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

export function startRecording(type: ActivityType, nowMs = Date.now()): Promise<RecordingMeta> {
  return serial(async () => {
    await clearChunks();
    const meta: RecordingMeta = {
      clientId: uuidV4(),
      type,
      startedAtMs: nowMs,
      status: 'recording',
      segment: 0,
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
  fixes: { lat: number; lng: number; timestampMs: number; accuracy: number | null }[],
): Promise<void> {
  return serial(async () => {
    const meta = await getRecording();
    if (!meta || meta.status !== 'recording' || fixes.length === 0) return;
    const pts: RoamPoint[] = fixes
      .map((f): RoamPoint => [
        f.lat,
        f.lng,
        Math.round((f.timestampMs - meta.startedAtMs) / 100) / 10,
        f.accuracy ?? 0,
        meta.segment,
      ])
      .filter((p) => p[2] >= 0);
    if (pts.length === 0) return;

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
    if (!meta || meta.status !== 'recording') return meta;
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
    if (!meta || meta.status !== 'paused') return meta;
    meta.pausedTotalMs += nowMs - (meta.pausedAtMs ?? nowMs);
    meta.pausedAtMs = null;
    meta.status = 'recording';
    meta.segment += 1;
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
