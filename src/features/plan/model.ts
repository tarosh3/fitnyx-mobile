import type { Plan, PlanSchedule, StarterExercise, TimeOfDay, Weekday } from '@/src/lib/api/plan';
import type { Reminder } from '@/src/lib/reminders';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Mornings', afternoon: 'Afternoons', evening: 'Evenings',
};

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose fat',
  build_muscle: 'Build muscle',
  improve_strength: 'Get stronger',
  improve_flexibility: 'Move better',
  improve_health: 'Better health',
  reduce_stress: 'Less stress',
};

export function goalLabel(goal: string): string {
  return GOAL_LABELS[goal] ?? 'Get fitter';
}

/** 2210 → "2,210" without relying on Intl (Hermes builds differ). */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "Mon · Wed · Fri" in week order. */
export function formatDays(days: Weekday[]): string {
  return WEEKDAYS.filter((d) => days.includes(d)).map((d) => DAY_LABELS[d]).join(' · ');
}

/** "7:00 AM" for the reminder time. */
export function formatClock(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** JS Date#getDay numbers (0 = Sunday) for the schedule's days. */
export function jsWeekdays(days: Weekday[]): number[] {
  return days.map((d) => (WEEKDAYS.indexOf(d) + 1) % 7).sort((a, b) => a - b);
}

/** The workout reminder that matches the plan: its time, on its days only. */
export function planReminder(s: PlanSchedule): Omit<Reminder, 'id' | 'createdAt'> {
  return {
    type: 'workout',
    label: 'Workout time',
    enabled: true,
    schedule: { kind: 'daily', hour: s.reminder_hour, minute: s.reminder_minute, days: jsWeekdays(s.preferred_days) },
  };
}

/** "3 × 12", "3 × 30 s" or "15 min" for a starter exercise. */
export function exerciseTarget(e: StarterExercise): string {
  const sets = e.target_sets ?? 1;
  if (e.tracking_type === 'cardio' && e.target_duration_sec) return `${Math.round(e.target_duration_sec / 60)} min`;
  if (e.target_duration_sec) return `${sets} × ${e.target_duration_sec} s`;
  if (e.target_reps) return `${sets} × ${e.target_reps}`;
  return `${sets} sets`;
}

/** What the diet wizard starts with: the onboarding answers instead of fixed defaults. */
export function dietWizardDefaults(plan: Plan | null): { goal?: string; activity_level?: string; diet_type?: string } {
  if (!plan) return {};
  const { goal, activity_level, diet_type } = plan.diet_defaults;
  return { goal, activity_level, ...(diet_type ? { diet_type } : {}) };
}

/** "−500 kcal for fat loss" / "+250 kcal to build muscle" / "maintenance". */
export function adjustmentLabel(adjustment: number): string {
  if (adjustment < 0) return `${thousands(-adjustment)} kcal under maintenance`;
  if (adjustment > 0) return `${thousands(adjustment)} kcal over maintenance`;
  return 'Maintenance calories';
}
