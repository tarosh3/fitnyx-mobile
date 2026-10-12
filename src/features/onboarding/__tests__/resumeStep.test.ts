import { resumeStepIndex } from '../resumeStep';

const STEPS = 13; // Welcome + 12 questions

it('reopens on the next unfilled step, not the one just saved', () => {
  // Username saved → the backend says step 2 (date of birth) is next.
  expect(resumeStepIndex(2, STEPS)).toBe(2);
  expect(resumeStepIndex(7, STEPS)).toBe(7);
});

it('starts at Welcome for a brand-new user', () => {
  expect(resumeStepIndex(1, STEPS)).toBe(0);
  expect(resumeStepIndex(0, STEPS)).toBe(0);
  expect(resumeStepIndex(Number.NaN, STEPS)).toBe(0);
});

it('lands on the last step when everything is filled but not completed', () => {
  expect(resumeStepIndex(13, STEPS)).toBe(12);
});
