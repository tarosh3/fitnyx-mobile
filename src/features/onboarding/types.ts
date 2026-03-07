import { OnboardingData } from '@/src/lib/api/onboarding';

export interface OnboardingStepProps {
  onNext: (data?: Record<string, unknown>) => void;
  onBack: () => void;
  data: OnboardingData | null;
  saving: boolean;
}
