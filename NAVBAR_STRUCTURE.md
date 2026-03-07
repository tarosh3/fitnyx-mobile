# Navbar Structure & Navigation Endpoints

This document describes the structure and routing of the bottom navigation bar in the Fitnyx mobile application.

## Endpoints Mapping

| Position | Screen | Endpoint | Icon | Color Accent |
| :--- | :--- | :--- | :--- | :--- |
| **1st (Left)** | **Home** | `/` | `Home` | Primary (Lime) |
| **2nd** | **Exercises** | `/exercises` | `Dumbbell` | Primary (Lime) |
| **3rd (Center)** | **AI Coach** | *Popup* | `Sparkles` | **Yellow (#F59E0B)** |
| **4th** | **Dashboard** | `/dashboard` | `LayoutGrid` | Primary (Lime) |
| **5th (Right)** | **Settings** | `/settings` | `Settings` | Primary (Lime) |

## Implementation Details

- **Component**: `src/components/navigation/BottomNav.tsx`
- **Center Button**: The AI Coach button is a persistent, highlighted action that opens a centered chat popup via the `AICoachProvider`.
- **Visibility**: The navbar is hidden on specific routes like `onboarding`, `profile`, `session`, and `login` to maintain focus.
- **Styling**: Uses a glassmorphic background (`BlurView`) with high-contrast active states.

## Route Definitions (Expo Router)

Registered in `app/_layout.tsx`:
- `index.tsx` -> `/`
- `exercises.tsx` -> `/exercises`
- `dashboard/index.tsx` -> `/dashboard`
- `settings.tsx` -> `/settings`
