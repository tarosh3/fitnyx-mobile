/** The backend's "everything is filled" step number (computeCurrentStep). */
export const ALL_FILLED_STEP = 13;

/**
 * Which screen to reopen onboarding on. The backend's current_step is the next
 * step to fill, in backend numbers (1 = Username, 2 = Date of birth…).
 * `stepNumbers` is each screen's backend number in screen order (0 = Welcome).
 * The optional Schedule screen is backend step 13 but sits after Frequency, so
 * numbers aren't positions; and 13 from the backend still means "all filled".
 * It used to subtract 1, which reopened the step just saved.
 * 0 / 1 → Welcome (fresh start); all filled / unknown → the last screen.
 */
export function resumeStepIndex(currentStep: number, stepNumbers: number[]): number {
  if (!Number.isFinite(currentStep) || currentStep <= 1) return 0;
  const last = stepNumbers.length - 1;
  if (currentStep >= ALL_FILLED_STEP) return last;
  const at = stepNumbers.indexOf(Math.floor(currentStep));
  return at === -1 ? last : at;
}
