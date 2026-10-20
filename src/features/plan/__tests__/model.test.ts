import type { Plan, PlanSchedule } from '@/src/lib/api/plan';
import { adjustmentLabel, dietWizardDefaults, exerciseTarget, formatClock, formatDays, jsWeekdays, planReminder, thousands } from '../model';

const schedule: PlanSchedule = {
  days_per_week: 3, session_min: 45, preferred_days: ['mon', 'wed', 'fri'], preferred_time: 'morning',
  reminder_hour: 7, reminder_minute: 0, split: 'full_body', days_chosen: true,
};

it('formats numbers, days and times', () => {
  expect(thousands(2210)).toBe('2,210');
  expect(thousands(980)).toBe('980');
  expect(formatDays(['fri', 'mon', 'wed'])).toBe('Mon · Wed · Fri');
  expect(formatClock(7, 0)).toBe('7:00 AM');
  expect(formatClock(18, 30)).toBe('6:30 PM');
  expect(formatClock(0, 5)).toBe('12:05 AM');
});

it('turns plan days into JS weekday numbers (Sunday = 0)', () => {
  expect(jsWeekdays(['mon', 'wed', 'fri'])).toEqual([1, 3, 5]);
  expect(jsWeekdays(['sun', 'sat'])).toEqual([0, 6]);
});

it('builds a workout reminder on the plan days only', () => {
  expect(planReminder(schedule)).toEqual({
    type: 'workout', label: 'Workout time', enabled: true,
    schedule: { kind: 'daily', hour: 7, minute: 0, days: [1, 3, 5] },
  });
});

it('describes exercise targets by tracking type', () => {
  const base = { exercise_uuid: 'x', title: 'X', target_sets: 3, target_reps: null, target_duration_sec: null, rest_seconds: 60 };
  expect(exerciseTarget({ ...base, tracking_type: 'weight_reps', target_reps: 12 })).toBe('3 × 12');
  expect(exerciseTarget({ ...base, tracking_type: 'duration', target_duration_sec: 30 })).toBe('3 × 30 s');
  expect(exerciseTarget({ ...base, tracking_type: 'cardio', target_sets: 1, target_duration_sec: 900 })).toBe('15 min');
});

it('labels the calorie adjustment', () => {
  expect(adjustmentLabel(-500)).toBe('500 kcal under maintenance');
  expect(adjustmentLabel(250)).toBe('250 kcal over maintenance');
  expect(adjustmentLabel(0)).toBe('Maintenance calories');
});

it('pre-fills the diet wizard from the plan', () => {
  expect(dietWizardDefaults(null)).toEqual({});
  const plan = { diet_defaults: { goal: 'weight_loss', activity_level: 'active', diet_type: 'vegetarian' } } as Plan;
  expect(dietWizardDefaults(plan)).toEqual({ goal: 'weight_loss', activity_level: 'active', diet_type: 'vegetarian' });
  const noType = { diet_defaults: { goal: 'maintenance', activity_level: 'lightly_active' } } as Plan;
  expect(dietWizardDefaults(noType)).toEqual({ goal: 'maintenance', activity_level: 'lightly_active' });
});
