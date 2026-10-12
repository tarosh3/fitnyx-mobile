/**
 * Which screen to reopen onboarding on. The backend's current_step is the next
 * step to fill, numbered like STEPS (1 = Username, 2 = Date of birth…), so it
 * IS the index. It used to subtract 1, which reopened the step just saved:
 * any reload right after choosing a username asked for it again.
 * 0 / 1 → Welcome (fresh start); past the end → the last step.
 */
export function resumeStepIndex(currentStep: number, stepCount: number): number {
  if (!Number.isFinite(currentStep) || currentStep <= 1) return 0;
  return Math.min(Math.floor(currentStep), stepCount - 1);
}
