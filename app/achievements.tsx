import { Redirect } from 'expo-router';

// Achievements became the Trophy case's badges (2026-10).
export default function AchievementsRedirect() {
  return <Redirect href={'/trophies?tab=badges' as never} />;
}
