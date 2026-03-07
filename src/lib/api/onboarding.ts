import { getAuthToken } from '@/src/lib/api/auth';
import { getApiBaseUrl } from '@/src/lib/config/backend';

const API_URL = getApiBaseUrl();

export interface FitnessProfile {
  primary_goal: string;
  experience_level: string;
  workout_frequency: string;
  workout_location: string;
  injuries: string[];
  injuries_other: string;
  workout_intensity: string;
  motivation: string;
}

export interface OnboardingData {
  id: string;
  user_id: string;
  username: string;
  dob: string | null;
  gender: string;
  height: number;
  weight: number;
  fitness_profile: FitnessProfile | null;
  onboarding_complete: boolean;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatus {
  onboarding_complete: boolean;
}

export async function getOnboarding(): Promise<OnboardingData> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/onboarding`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch onboarding data');
  }
  return response.json();
}

export async function saveOnboardingStep(
  stepNumber: number,
  data: Record<string, unknown>
): Promise<OnboardingData> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/onboarding/step/${stepNumber}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save onboarding step');
  }

  return response.json();
}

export async function completeOnboarding(): Promise<OnboardingData> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/onboarding/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to complete onboarding');
  }

  return response.json();
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/onboarding/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch onboarding status');
  }

  return response.json();
}
