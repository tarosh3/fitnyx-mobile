import { Paths, File, Directory } from 'expo-file-system';
import { useEffect, useState } from 'react';

const VIDEO_DIR_NAME = 'workout-videos';

function sanitizeFilename(url: string): string {
  return url.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-100);
}

// Downloads live in the document directory, not the cache directory, so the OS
// doesn't purge them under storage pressure — the point of a download is that
// it's there offline later.
function getVideoDir(): Directory {
  return new Directory(Paths.document, VIDEO_DIR_NAME);
}

function ensureDir(): void {
  const dir = getVideoDir();
  if (!dir.exists) {
    dir.create();
  }
}

export async function getCachedVideoUri(remoteUrl: string): Promise<string | null> {
  const filename = sanitizeFilename(remoteUrl);
  const file = new File(getVideoDir(), filename);

  try {
    if (file.exists) return file.uri;
  } catch {
    // Not cached
  }

  return null;
}

export async function cacheVideo(remoteUrl: string): Promise<string | null> {
  const filename = sanitizeFilename(remoteUrl);
  try {
    ensureDir();
    const file = new File(getVideoDir(), filename);
    if (file.exists) return file.uri;

    const downloaded = await File.downloadFileAsync(remoteUrl, getVideoDir());
    if (downloaded.uri === file.uri) return file.uri;

    // Downloaded under the server-assigned name — rename it to our sanitized key
    // so getCachedVideoUri(url) can find it again. Without this the file was
    // cached but never retrievable, and playback still fell back to the image.
    try {
      downloaded.move(file);
      return file.exists ? file.uri : downloaded.uri;
    } catch {
      return downloaded.exists ? downloaded.uri : null;
    }
  } catch (error) {
    // A concurrent call already cached it.
    if ((error as { message?: string })?.message?.includes('Destination already exists')) {
      const file = new File(getVideoDir(), filename);
      return file.exists ? file.uri : null;
    }
    console.warn('Failed to cache video:', error);
    return null;
  }
}

/** Total bytes of all downloaded videos on disk. */
export async function videoCacheBytes(): Promise<number> {
  try {
    const dir = getVideoDir();
    if (!dir.exists) return 0;
    let total = 0;
    for (const entry of dir.list()) {
      if (entry instanceof File) total += entry.size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function cacheWorkoutVideos(videoUrls: string[]): Promise<void> {
  const urls = videoUrls.filter(Boolean);
  if (!urls.length) return;

  ensureDir();
  await Promise.all(urls.map((url) => cacheVideo(url)));
}

/**
 * The best video source for a player: online, the remote URL (works, and the
 * file is cached in the background for later); offline, the locally cached file
 * if the workout pre-cached it (`cacheWorkoutVideos`), else null so the caller
 * falls back to the still image. Without this, the players always pointed at the
 * remote URL and showed nothing offline even though the file was on disk.
 */
export function useVideoSource(remoteUrl: string | null, isOnline: boolean): string | null {
  const [source, setSource] = useState<string | null>(remoteUrl && isOnline ? remoteUrl : null);
  useEffect(() => {
    let live = true;
    if (!remoteUrl) { setSource(null); return; }
    if (isOnline) { setSource(remoteUrl); return; }
    getCachedVideoUri(remoteUrl)
      .then((cached) => { if (live) setSource(cached); })
      .catch(() => { if (live) setSource(null); });
    return () => { live = false; };
  }, [remoteUrl, isOnline]);
  return source;
}

export async function clearVideoCache(): Promise<void> {
  try {
    const dir = getVideoDir();
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Ignore cleanup errors
  }
}
