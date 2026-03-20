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

    // Download to a temp name first, then move to final destination to avoid conflicts
    const tempName = `_tmp_${Date.now()}_${filename}`;
    const tempFile = new File(getVideoDir(), tempName);

    try {
      const downloaded = await File.downloadFileAsync(remoteUrl, getVideoDir());
      // If downloaded file has a different name, move it to our sanitized name
      if (downloaded.uri !== file.uri) {
        // The file was downloaded with server-assigned name; just use it
        return downloaded.uri;
      }
      return file.uri;
    } catch (downloadError: any) {
      // If destination already exists, the file was cached by a concurrent call
      if (downloadError?.message?.includes('Destination already exists')) {
        return file.exists ? file.uri : null;
      }
      throw downloadError;
    }
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
