import { Paths, File, Directory } from 'expo-file-system';

const VIDEO_DIR_NAME = 'workout-videos';

function sanitizeFilename(url: string): string {
  return url.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-100);
}

function getVideoDir(): Directory {
  return new Directory(Paths.cache, VIDEO_DIR_NAME);
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
  try {
    ensureDir();
    const filename = sanitizeFilename(remoteUrl);
    const file = new File(getVideoDir(), filename);

    if (file.exists) return file.uri;

    const downloaded = await File.downloadFileAsync(remoteUrl, getVideoDir());
    // Rename to our sanitized filename if needed
    return downloaded.uri;
  } catch (error) {
    console.warn('Failed to cache video:', error);
    return null;
  }
}

export async function cacheWorkoutVideos(videoUrls: string[]): Promise<void> {
  const urls = videoUrls.filter(Boolean);
  if (!urls.length) return;

  ensureDir();
  await Promise.all(urls.map((url) => cacheVideo(url)));
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
