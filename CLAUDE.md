# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

**Always add `/Users/taroshmathuria/FitNyx/backend` and `/Users/taroshmathuria/Documents/AdminDashboard/admin` as additional working directories at the start of every session (use `/add-dir`).**

---

## Self-improvement

Whenever you make a mistake, get corrected, or discover something new about this codebase:
- Immediately update the relevant CLAUDE.md with a specific rule
- Be precise — write exactly what went wrong and the exact rule to follow
- Never write vague notes like "be careful with X" — write actionable rules

---

## Commands

```bash
npx expo start            # Start dev server
npx expo run:ios          # Run on iOS simulator
npx expo run:android      # Run on Android emulator
npm test                  # Jest tests (jest-expo preset)
npm run test:watch        # Jest watch mode
npm run test:coverage     # Jest with coverage
npx tsc --noEmit          # Type-check (same as CI)
```

No eslint/prettier configured yet.

**CI**: `.github/workflows/ci.yml` runs `tsc --noEmit`, `npm test`, and `npx expo export --platform web` on push/PR to main/staging. Run all three locally before pushing.

**Builds**: `eas.json` profiles — `development` (dev client, localhost backend), `preview` (internal Android APK, prod backend), `production` (autoIncrement). Prod backend: `https://fitnyx.onrender.com`. Bundle ID: `com.fitnyx.app`.

**Backend** (from `/Users/taroshmathuria/FitNyx/backend`): `go run ./cmd/server` (loads `.env` via godotenv), `make test`, `make test-cover`.

**Project skills** (`.claude/skills/`): `run-app`, `build-apk`, `test-app`, `debug-app` — use these for running, building APKs, testing, and debugging workflows.

---

## Environment

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_BACKEND_URL` — Backend base URL (default: http://localhost:8080)
- `EXPO_PUBLIC_API_URL` — Defaults to BACKEND_URL/api/v1
- Android emulator: localhost auto-remaps to 10.0.2.2

---

## Architecture

**Routing:** Expo Router (file-based). All screens in `app/`. Path alias `@/` = project root (tsconfig.json).

**Provider order in `app/_layout.tsx`:**
`AuthProvider → ThemeProvider → WorkoutProvider → AICoachProvider`

- `AuthProvider` — Supabase session, onboarding redirects, offline queue sync, hides splash
- `ThemeProvider` — light/dark toggle, persisted as `fitnyx-theme`. Use `useTheme()` and `useThemeColors()`
- `WorkoutProvider` — active session polled every 30s, elapsed timer. Use `useWorkout()`
- `AICoachProvider` — AI coach chat state, talks to `/api/v1/agent/*`. Use `useAICoach()`

**API (`src/lib/api.ts` + `src/lib/api/`):**
All authenticated calls via `fetchWithAuth()` — attaches Supabase JWT automatically.
Domain modules: `auth`, `dashboard`, `exercises`, `onboarding`, `users`, `username`, `workoutPlans`, `workoutSessions`, `agent`.

**Cache (`src/lib/cache/`):**
Two layers: in-memory Map (fast) + AsyncStorage via indexeddb.ts (persisted).
- Use `cacheGet` / `cacheSet` / `cacheInvalidate` from `src/lib/cache/index.ts`
- Keys defined in `src/lib/cache/keys.ts` — TTLs: SHORT 1m, MEDIUM 5m, LONG 30m, DAY 24h
- Component data fetching: `cacheGet` first, fetch on miss, `cacheSet` the result (see `useRetentionMetrics`) — there is NO `useCachedQuery` hook in this codebase (audit 2026-07-05 confirmed zero references; don't invent it)

**Offline (`src/lib/db.ts`):**
AsyncStorage store for workout plans, days, exercises. Queue key: `fitnyx-db:offline-queue`. Replayed by AuthProvider on reconnect.

**Supabase (`src/lib/supabase.ts`):**
PKCE flow, AsyncStorage session persistence, auto-refresh pauses when backgrounded.

---

## File structure rules

- New screens → `app/` (Expo Router conventions)
- New shared components → `src/components/ui/`
- New feature code → `src/features/<feature>/`
- New API domain calls → `src/lib/api/<domain>.ts`
- New cache keys → `src/lib/cache/keys.ts` only — never inline strings

## Feature modules (`src/features/`)

`auth` · `dashboard` · `diet` · `home` · `onboarding` · `workouts`

## UI primitives (`src/components/ui/`)

Button, Card, Input, Screen, PageHeader, ConfirmModal, Logo

Global overlays (root level): BottomNav, ActiveSessionIndicator, AICoachChat, BackendKeepAlive, SyncManager

## Fonts

- Anton 400 — FITNYX wordmark/logo only
- Inter 400/500/600/700/800 — all UI text

---

## Coding rules — never break these

- `fetchWithAuth()` for every API call — never raw fetch
- `useThemeColors()` for every color — never hardcode hex values
- Named exports only — never default exports
- Cache keys in `src/lib/cache/keys.ts` — never inline strings
- Cached data fetching in components: `cacheGet` → fetch on miss → `cacheSet` (no `useCachedQuery` hook exists)
- Components over ~150 lines should be split

---

## God Mode — working rules (follow every time)

**Zero guesswork**
- Never edit from assumed contents — Read the actual file first
- Function/API/type not in context → grep for it; never infer signatures
- Ambiguous requirement or constraint → ask, don't guess
- Plan fails or bug appears → discard the assumption, check logs/actual state; zero ego

**Cross-repo sync** (mobile ↔ Go backend ↔ admin dashboard)
- Before editing, state which repos are impacted and any breaking changes
- API request/response shapes must stay aligned: Go handlers ↔ mobile `src/lib/api/*` types
- DB schema is owned by the Go backend (SQL migrations) — admin Prisma and mobile follow, never lead (see `db-migrate` skill)

**Execution loop — every task**
1. **Discovery**: read/grep the actual state of all relevant repos
2. **Impact analysis**: list repos/services touched + potential breaking changes
3. **Plan**: multi-file or non-trivial change → list files + blast radius before editing; public API contract change → wait for user confirmation
4. **Implement + verify**: task is incomplete until checks pass

**Scope discipline**
- Smallest change that solves the problem — no drive-by refactors, no speculative abstraction, no reformatting untouched lines, no placeholder TODOs
- Fix needs a big change → state why before writing it
- Find the pattern: match a similar existing feature exactly; extend existing modules before creating new files
- Check `src/lib/api/` before writing any API call

**Done = verified**
- Mobile: `npx tsc --noEmit && npm test` · Backend: `make test` · Admin: `npm run build`
- Report failures honestly — never paper over a red test

**Output style**: 1–2 sentences per action; let diffs and passing tests speak.

---

## Slash commands

- `/project:add-feature` — adds a full-stack feature with plan-first approach
- `/project:review` — audits code for bugs and pattern violations
- `/project:sync-api` — maps all backend endpoints vs mobile API calls

---

## Mistakes log

_Claude updates this section automatically when corrections are made._

### Android build (`expo run:android`)

- **`android/` is gitignored (prebuild-managed).** After cloning or if a build fails on stale native config, regenerate with `npx expo prebuild -p android --clean` so config plugins (`plugins/withNotifeeRepo.js`, `withNotifIcon.js`, `withFirebasePodfileFix.js`) re-apply. Never hand-edit `android/` — fix the config plugin instead.
- **`prebuild --clean` wipes `android/local.properties`** → build fails `SDK location not found`. Recreate it: `sdk.dir=/Users/taroshmathuria/Library/Android/sdk`. `ANDROID_HOME` is NOT set in the shell/profile; SDK lives at `~/Library/Android/sdk` (has platforms 35/36/36.1).
- **Notifee maven repo:** `expo run:android` passes `--configure-on-demand` + `org.gradle.parallel=true`, so notifee's own `rootProject.allprojects` repo injection runs too late → `Could not find app.notifee:core`. `plugins/withNotifeeRepo.js` must inject `maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }` into the app's `allprojects.repositories`. That plugin's gate must be `config.modResults.language === 'groovy'` (NOT `'gradle'`) — `withProjectBuildGradle` sets `language` to `'groovy'`/`'kt'`, never `'gradle'`, so the wrong value silently no-ops the plugin.