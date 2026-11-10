/** Shared geometry for the dock, scroll clearance and active-session player. */
export const BOTTOM_NAV_HEIGHT = 58;
export const BOTTOM_NAV_LIFT = 16;
export const bottomNavGap = (bottomInset: number) => Math.max(bottomInset, 12);
export const bottomNavClearance = (bottomInset: number) => BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT + bottomNavGap(bottomInset);
/** The light blur under the dock: from the screen's edge to just behind the pill, never above it. */
export const dockBackdropHeight = (bottomInset: number) => bottomNavGap(bottomInset) + 10;

const hiddenRoutePrefixes = [
  '/onboarding', '/settings/coach-memory', '/reminders', '/water', '/profile',
  '/fitness-profile', '/dashboard/stats', '/dashboard/diet', '/diet', '/login', '/signup', '/workouts/summary',
  // Workouts flows with their own action bar (Start, Repeat, Add…).
  '/workouts/session', '/workouts/routine', '/workouts/history', '/workouts/exercise', '/workouts/programs', '/workouts/report', '/workouts/today', '/roam/record', '/update-password', '/privacy-policy',
  '/terms-of-service', '/delete-account', '/email-verified', '/verification-failed',
  '/pro', '/referrals', '/invite', '/access-expired', '/trophies', '/readiness', '/cardio',
  // Has its own Start bar.
  '/plan',
];

export const isBottomNavRoute = (pathname: string) => {
  const [, root, child] = pathname.split('/');
  // Recording and saved Roams own their action footer. Keep the dock on the
  // Roam list and heatmap, which still use the main app navigation.
  if (root === 'roam' && child && child !== 'heatmap') return false;
  return !hiddenRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};
