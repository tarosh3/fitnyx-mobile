import { Redirect } from 'expo-router';

// History moved into the Workouts tab (2026-10).
export default function HistoryRedirect() {
  return <Redirect href="/workouts?tab=history" />;
}
