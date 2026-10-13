import { Redirect } from 'expo-router';

// Plans moved into the Workouts tab: routines and programs (2026-10).
export default function SelectRedirect() {
  return <Redirect href="/workouts" />;
}
