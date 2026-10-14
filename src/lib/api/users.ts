import { fetchWithAuth } from '@/src/lib/api';

export interface UpdateProfileData {
  username?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  dob?: string;
  phone?: string;
  avatar_url?: string;
  theme_preference?: 'dark' | 'light';
  bio?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  gender?: string;
  dob?: string;
  bio?: string;
  onboarding_complete: boolean;
  subscription_tier: string;
}

export async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
  return fetchWithAuth('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getProfile(): Promise<UserProfile> {
  return fetchWithAuth('/users/me');
}

// Schedules the account for permanent deletion after a 30-day grace window
// and revokes all backend sessions. Logging back in within the window cancels
// it. Caller is responsible for local purge via signOut().
export async function deleteAccount() {
  return fetchWithAuth('/users/me', { method: 'DELETE' });
}

/** Signed by the backend for the caller's own image (avatars/<userId>, overwritten). Mirrors avatar.UploadParams. */
export interface AvatarUploadParams {
  upload_url: string;
  api_key: string;
  timestamp: number;
  signature: string;
  public_id: string;
  overwrite: string;
  invalidate: string;
  allowed_formats: string;
}

export async function getAvatarUploadParams(): Promise<AvatarUploadParams> {
  return fetchWithAuth('/users/me/avatar/upload', { method: 'POST' });
}

/** Records the uploaded image as the profile photo; the backend builds the URL. */
export async function setAvatar(version: number, format: string): Promise<{ avatar_url: string }> {
  return fetchWithAuth('/users/me/avatar', { method: 'PUT', body: JSON.stringify({ version, format }) });
}
