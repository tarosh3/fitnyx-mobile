import { resumeStepIndex } from '../resumeStep';

// Welcome, Username … Frequency (8), Schedule (13), Location (9) … Motivation (12)
const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 13, 9, 10, 11, 12];

it('reopens on the next unfilled step, not the one just saved', () => {
  // Username saved → the backend says step 2 (date of birth) is next.
  expect(resumeStepIndex(2, STEPS)).toBe(2);
  expect(resumeStepIndex(7, STEPS)).toBe(7);
});

it('maps backend numbers after the Schedule screen to their position', () => {
  // Frequency saved → next is Location (backend 9), shown after Schedule.
  expect(resumeStepIndex(9, STEPS)).toBe(10);
  expect(resumeStepIndex(12, STEPS)).toBe(13);
});

it('starts at Welcome for a brand-new user', () => {
  expect(resumeStepIndex(1, STEPS)).toBe(0);
  expect(resumeStepIndex(0, STEPS)).toBe(0);
  expect(resumeStepIndex(Number.NaN, STEPS)).toBe(0);
});

it('lands on the last step when everything is filled but not completed', () => {
  // 13 is also the Schedule screen's number — it must not reopen Schedule.
  expect(resumeStepIndex(13, STEPS)).toBe(13);
  expect(resumeStepIndex(20, STEPS)).toBe(13);
});
