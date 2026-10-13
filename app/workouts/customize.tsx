import { Redirect } from 'expo-router';

// The 3-step plan wizard became the one-screen routine editor (2026-10).
export default function CustomizeRedirect() {
  return <Redirect href="/workouts/routine/edit" />;
}
