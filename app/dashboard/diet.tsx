import { Redirect } from 'expo-router';

/** Old route (Home links and notifications before the diet revamp). */
export default function OldDietRoute() {
  return <Redirect href="/diet" />;
}
