# Bottom navigation

The compact dock places four destinations and the central Coach action on one level.

| Position | Label | Destination | Icon |
| --- | --- | --- | --- |
| 1 | Home | `/` | Two-tone home |
| 2 | Workouts | `/workouts` | Angled dumbbell |
| 3 | Coach | Opens Filo chat | Coach speech bubble |
| 4 | Progress | `/dashboard` | Ascending progress bars |
| 5 | Profile | `/me` | Person |

## Design and behavior

- `src/components/navigation/BottomNav.tsx` renders the surface and controls. Screen reader order matches the visual order.
- `NavIcon.tsx` contains custom vector artwork on a shared 32-point canvas. All five icons render at 24 points with matching alignment and labeled controls.
- The dock is 58 points tall with no raised action. Its width is capped at 420 points; five equal slots preserve at least 44-point touch targets at a 320-point viewport. Safe-area insets are preserved.
- Colors come from `src/theme/colors.ts`: neutral charcoal in dark mode and white in light mode. Green is reserved for the selected destination; Coach uses neutral ink. The opaque surface does not depend on blur or transparency settings.
- Selection uses an accented icon, a bold label, and a small marker. Press feedback and selection fades respect system Reduce Motion settings.
- Tabs reset the pushed stack before replacing the root route. Coach opens a modal without changing the selected destination.
- `bottomNavLayout.ts` owns height, lift, safe-area gap, clearance, and hidden routes. Screens and the active-workout player use the same clearance so content clears the dock without reserving the former raised-button space.
- The dock hides when signed out, before onboarding finishes, while the keyboard or coach is open, and on focused flows defined in `isBottomNavRoute`.
