import type { PlanSchedule } from '@/src/lib/api/plan';
import { deleteReminder, listReminders, upsertReminder } from '@/src/lib/reminders';
import { planReminder } from './model';

// Kept apart from data.ts: reminders load notifee, which screens that only
// read the plan (Diet, Home) shouldn't pull in.

/** The reminder the plan screen creates; a fixed id so turning it on twice replaces it. */
export const PLAN_REMINDER_ID = 'plan-workout';

export async function hasPlanReminder(): Promise<boolean> {
  return (await listReminders()).some((r) => r.id === PLAN_REMINDER_ID && r.enabled);
}

/** Creates (or updates) the workout reminder on the plan's days and time. */
export async function enablePlanReminder(schedule: PlanSchedule): Promise<void> {
  await upsertReminder({ id: PLAN_REMINDER_ID, ...planReminder(schedule) });
}

export async function disablePlanReminder(): Promise<void> {
  await deleteReminder(PLAN_REMINDER_ID);
}
