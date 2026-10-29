/** Shared geometry for the dock, scroll clearance and active-session player. */
export const BOTTOM_NAV_HEIGHT = 58;
export const BOTTOM_NAV_LIFT = 16;
export const bottomNavGap = (bottomInset: number) => Math.max(bottomInset, 12);
export const bottomNavClearance = (bottomInset: number) => BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT + bottomNavGap(bottomInset);

const hiddenRoutePrefixes = [
  '/onboarding', '/settings/coach-memory', '/reminders', '/water', '/profile',
  '/fitness-profile', '/dashboard/stats', '/dashboard/diet', '/diet', '/login', '/signup', '/workouts/summary',
  // Workouts flows with their own action bar (Start, Repeat, Add…).
  '/workouts/session', '/workouts/routine', '/workouts/history', '/workouts/exercise', '/workouts/programs', '/roam/record', '/update-password', '/privacy-policy',
  '/terms-of-service', '/delete-account', '/email-verified', '/verification-failed',
  '/invite', '/access-expired', '/trophies',
  // Has its own Start bar.
  '/plan',
];

export const isBottomNavRoute = (pathname: string) =>
  !hiddenRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
