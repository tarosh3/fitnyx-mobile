# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

No lint or test commands are configured in `package.json`.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_BACKEND_URL` — Backend base URL (default: `http://localhost:8080`)
- `EXPO_PUBLIC_API_URL` — Optional override for API URL (defaults to `BACKEND_URL/api/v1`)

On Android emulator, `localhost` is automatically remapped to `10.0.2.2`.

## Architecture

### Routing

Uses **Expo Router** (file-based routing). All screens are in `app/`. The root layout (`app/_layout.tsx`) wraps everything in four providers in order: `AuthProvider → ThemeProvider → WorkoutProvider → AICoachProvider`.

Path alias `@/` maps to the project root (configured in `tsconfig.json`).

### Provider Hierarchy

- **`AuthProvider`** — Manages Supabase session, onboarding redirect logic, avatar, and offline queue sync on reconnect. Hides the splash screen once auth is resolved.
- **`ThemeProvider`** — Light/dark theme toggle persisted under key `fitnyx-theme`. Colors defined in `src/theme/colors.ts`, typography in `src/theme/typography.ts`. Consume via `useTheme()` and `useThemeColors()`.
- **`WorkoutProvider`** — Tracks the active workout session (polled every 30s) and live elapsed timer. Consume via `useWorkout()`.
- **`AICoachProvider`** — Manages the AI coach chat state and communicates with `/api/v1/agent/*` endpoints. Consume via `useAICoach()`.

### Data Layer

**Backend API** (`src/lib/api.ts` + `src/lib/api/`): All authenticated calls go through `fetchWithAuth()`, which attaches the Supabase JWT. Endpoints live under `API_BASE_URL` (resolved from env). Domain-specific modules: `auth`, `exercises`, `onboarding`, `users`, `username`, `workoutPlans`, `workoutSessions`, `agent`.

**Caching** (`src/lib/cache/`): Two-layer cache:
1. In-memory `Map` (fast, non-persistent)
2. AsyncStorage via `indexeddb.ts` (persisted)

Use `cacheGet`/`cacheSet`/`cacheInvalidate` from `src/lib/cache/index.ts`. Cache keys are defined in `src/lib/cache/keys.ts`. TTL constants (`SHORT` 1m, `MEDIUM` 5m, `LONG` 30m, `DAY` 24h) and stale times are also in `keys.ts`.

`useCachedQuery` hook (`src/hooks/useCachedQuery.ts`) provides a stale-while-revalidate pattern for components.

**Offline** (`src/lib/db.ts`): AsyncStorage-backed local store for workout plans, days, and exercises. An offline request queue (`fitnyx-db:offline-queue`) is replayed by `AuthProvider` on reconnect.

**Supabase** (`src/lib/supabase.ts`): Client uses PKCE flow with AsyncStorage for session persistence. Auto-refresh pauses when app is backgrounded.

### Feature Modules (`src/features/`)

- `auth` — Auth landing, login/signup forms, onboarding carousel
- `dashboard` — Home stats and activity
- `diet` — Diet plan display
- `home` — Main home screen
- `onboarding` — Onboarding flow
- `workouts` — Workout selection, customization, session, history

### UI Primitives (`src/components/ui/`)

Shared components: `Button`, `Card`, `Input`, `Screen`, `PageHeader`, `ConfirmModal`, `Logo`.

Global overlays rendered at the root level (outside the screen stack): `BottomNav`, `ActiveSessionIndicator`, `AICoachChat`, `BackendKeepAlive`, `SyncManager`.

### Fonts

Two font families loaded in `_layout.tsx`:
- **Anton** (400) — used for the FITNYX wordmark/logo
- **Inter** (400/500/600/700/800) — body and UI text
