import { fetchWithAuth } from '@/src/lib/api';

export interface FitnessProfile {
  primary_goal: string;
  experience_level: string;
  workout_frequency: string;
  workout_location: string;
  injuries: string[];
  injuries_other?: string;
  preferred_intensity: string;
  motivations: string;
  equipment_access?: string;
}

export interface OnboardingData {
  user_id: string;
  username: string;
  dob: string | null;
  gender: string;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_profile: FitnessProfile | null;
  onboarding_complete: boolean;
  current_step: number;
}

export interface OnboardingStatus {
  onboarding_complete: boolean;
}

export async function getOnboarding(): Promise<OnboardingData> {
  return fetchWithAuth('/onboarding');
}

export async function saveOnboardingStep(
  stepNumber: number,
  data: Record<string, unknown>
): Promise<OnboardingData> {
  return fetchWithAuth(`/onboarding/step/${stepNumber}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function completeOnboarding(): Promise<{ message: string }> {
  return fetchWithAuth('/onboarding/complete', {
    method: 'POST',
  });
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return fetchWithAuth('/onboarding/status');
}
