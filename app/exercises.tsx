import { Redirect } from 'expo-router';

// The exercise library moved into the Workouts tab (2026-10).
export default function ExercisesRedirect() {
  return <Redirect href="/workouts?tab=exercises" />;
}
