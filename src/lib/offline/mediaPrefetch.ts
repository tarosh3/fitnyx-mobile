import { listRoutines, type Routine } from '@/src/lib/api/routines';
import { isOnWifi } from '@/src/lib/network';
import { cacheVideo, getCachedVideoUri, videoCacheBytes } from '@/src/lib/offline/videoCache';
import { getVideoDownloads } from '@/src/lib/prefs';

/**
 * Background prefetch of workout videos for offline use. Pulls the exercise
 * videos of the user's saved routines (the workouts they actually reuse) and
 * caches them to disk so the logger and exercise screens play offline without
 * the user having watched them first. Gated on Wi-Fi and a user setting, and
 * capped so it never fills the device.
 */

// A generous but bounded ceiling: enough for a dozen-plus routines of short
// demo clips, far from filling storage. Prefetch stops once the cache hits it.
const MAX_PREFETCH_BYTES = 150 * 1024 * 1024;

/** The distinct .mp4 exercise videos across the given routines. Pure. */
export function collectRoutineVideoUrls(routines: Routine[]): string[] {
  const urls = new Set<string>();
  for (const routine of routines ?? []) {
    for (const ex of routine.exercises ?? []) {
      const url = ex.exercise?.video_url?.trim();
      if (url && url.toLowerCase().endsWith('.mp4')) urls.add(url);
    }
  }
  return [...urls];
}

let running = false;

/**
 * Best-effort, single-flight. Returns silently when the setting is off, when
 * not on Wi-Fi, or when offline/listing fails — so callers can fire and forget.
 */
export async function prefetchWorkoutMedia(): Promise<void> {
  if (running) return;
  running = true;
  try {
    if (!(await getVideoDownloads())) return;
    if (!(await isOnWifi())) return;

    let routines: Routine[];
    try {
      routines = await listRoutines();
    } catch {
      return; // offline or server error — nothing to do
    }

    const urls = collectRoutineVideoUrls(routines);
    if (!urls.length) return;

    let bytes = await videoCacheBytes().catch(() => 0);
    for (const url of urls) {
      if (bytes >= MAX_PREFETCH_BYTES) break;
      if (await getCachedVideoUri(url)) continue;
      const uri = await cacheVideo(url);
      if (uri) bytes = await videoCacheBytes().catch(() => bytes);
    }
  } finally {
    running = false;
  }
}
