import type { RoutineExerciseInput } from '@/src/lib/api/routines';

/**
 * Starting points for "New routine". UUIDs are catalog rows (checked 2026-10-13);
 * the editor skips any that no longer exist, so a reseeded catalog degrades to
 * a shorter template instead of failing.
 */
export const TEMPLATES: { name: string; items: RoutineExerciseInput[] }[] = [
  { name: 'Push', items: [
    { exercise_uuid: '85e36e8a-23d5-44f0-9e6b-cca1105b4a4f', target_sets: 3, target_reps: 10, target_weight_kg: 40 }, // Bench Press
    { exercise_uuid: '90345d2f-a998-4562-8416-fb86fd70f3ba', target_sets: 3, target_reps: 10, target_weight_kg: 14 }, // Incline Dumbbell Press
    { exercise_uuid: '415318bb-e93d-4390-bc1d-7391ac16f22f', target_sets: 3, target_reps: 10, target_weight_kg: 12 }, // Dumbbell Shoulder Press
    { exercise_uuid: '1cff52ad-5943-4bac-878b-2af3ebbea1e9', target_sets: 3, target_reps: 12, target_weight_kg: 6 }, // Lateral Raise
    { exercise_uuid: 'c9d8f4bc-7766-48a3-8672-e91cf787ea3f', target_sets: 3, target_reps: 12, target_weight_kg: 20 }, // Tricep Pushdown
  ] },
  { name: 'Pull', items: [
    { exercise_uuid: '36da69ca-50bc-449b-8ce0-beeab7efcc58', target_sets: 3, target_reps: 10, target_weight_kg: 40 }, // Lat Pulldown
    { exercise_uuid: 'b59b9f6d-cd06-4ece-a4b7-b0b0edad7d86', target_sets: 3, target_reps: 10, target_weight_kg: 40 }, // Bent Over Row
    { exercise_uuid: '11cf7ebd-bb21-4192-9a59-f59e6fc24c2c', target_sets: 3, target_reps: 6 }, // Pull Up
    { exercise_uuid: '501cf135-d06e-4d24-b74c-5612c38d6396', target_sets: 3, target_reps: 10, target_weight_kg: 10 }, // Dumbbell Curl
  ] },
  { name: 'Legs', items: [
    { exercise_uuid: 'f01fd4dc-f779-44c6-b479-250965025d2a', target_sets: 3, target_reps: 10, target_weight_kg: 80 }, // Leg Press
    { exercise_uuid: '75425cc9-a57d-4dd7-ad94-78e5c6448619', target_sets: 3, target_reps: 8, target_weight_kg: 60 }, // Deadlift
    { exercise_uuid: 'cc7bd3ad-ade7-4b59-81e6-b36840bbbe72', target_sets: 3, target_reps: 12, target_weight_kg: 30 }, // Leg Extension
    { exercise_uuid: 'b83675bf-90ea-45e1-a563-29fb1429b2f9', target_sets: 3, target_reps: 12 }, // Hip Thrust
  ] },
  { name: 'Full body', items: [
    { exercise_uuid: 'f01fd4dc-f779-44c6-b479-250965025d2a', target_sets: 3, target_reps: 10, target_weight_kg: 60 },
    { exercise_uuid: '85e36e8a-23d5-44f0-9e6b-cca1105b4a4f', target_sets: 3, target_reps: 10, target_weight_kg: 30 },
    { exercise_uuid: 'b59b9f6d-cd06-4ece-a4b7-b0b0edad7d86', target_sets: 3, target_reps: 10, target_weight_kg: 30 },
    { exercise_uuid: '415318bb-e93d-4390-bc1d-7391ac16f22f', target_sets: 3, target_reps: 10, target_weight_kg: 8 },
    { exercise_uuid: '752e310f-1b8a-4b65-837f-5ee15ca940ab', target_sets: 2, target_duration_sec: 30 }, // Plank
  ] },
  { name: 'Abs', items: [
    { exercise_uuid: '701452b1-13ac-423e-9d82-118bc09eb9a5', target_sets: 3, target_reps: 20 }, // Crunch
    { exercise_uuid: '685f9230-f2a8-4180-9875-7994673b2af3', target_sets: 3, target_reps: 10 }, // Hanging Straight Leg Raise
    { exercise_uuid: '752e310f-1b8a-4b65-837f-5ee15ca940ab', target_sets: 3, target_duration_sec: 45 }, // Plank
  ] },
  { name: 'Cardio', items: [
    { exercise_uuid: '6f1c0a52-3b7e-4d1a-9c2e-1a7b9e0c4d01', target_sets: 1, target_duration_sec: 1200, target_distance_m: 3000 }, // Treadmill Run
  ] },
];
