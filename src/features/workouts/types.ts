import type { CreateDayInput, CreateExerciseInput } from '@/src/lib/api/workoutPlans';

export interface PlanData {
  planId?: string;
  title: string;
  description?: string;
  goal?: string;
  numDays: number;
}

export interface DayData extends CreateDayInput {
  tempId: number;
}

export interface DayExercises {
  dayId: string;
  exercises: CreateExerciseInput[];
}
