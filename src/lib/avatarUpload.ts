import { getAvatarUploadParams, setAvatar } from '@/src/lib/api/users';

/**
 * Uploads a ready-sized JPEG as the user's profile photo and returns its URL.
 * The image goes straight to Cloudinary with parameters the backend signed for
 * this user only; the upload replaces the previous photo. Plain fetch on
 * purpose: Cloudinary is a third party and must never receive our auth token.
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  const params = await getAvatarUploadParams();
  const form = new FormData();
  form.append('file', { uri: localUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  form.append('api_key', params.api_key);
  form.append('timestamp', String(params.timestamp));
  form.append('signature', params.signature);
  form.append('public_id', params.public_id);
  form.append('overwrite', params.overwrite);
  form.append('invalidate', params.invalidate);
  form.append('allowed_formats', params.allowed_formats);

  const res = await fetch(params.upload_url, { method: 'POST', body: form });
  const body = (await res.json().catch(() => ({}))) as { version?: number; format?: string; error?: { message?: string } };
  if (!res.ok || typeof body.version !== 'number' || !body.format) {
    throw Object.assign(new Error(body.error?.message || 'Photo upload failed'), { status: res.status });
  }
  const { avatar_url } = await setAvatar(body.version, body.format);
  return avatar_url;
}
