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

export async function updateProfile(data: UpdateProfileData) {
  return fetchWithAuth('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getProfile(): Promise<UserProfile> {
  return fetchWithAuth('/users/me');
}
