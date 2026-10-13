import { Redirect, useLocalSearchParams } from 'expo-router';

// Plan details are now program details (2026-10).
export default function PlanRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/workouts/programs/${id}`} />;
}
