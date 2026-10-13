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
Domain modules: `auth`, `dashboard`, `exercises`, `onboarding`, `users`, `username`, `workoutPlans`, `workoutSessions`, `agent`, `activities` (Roam).

**Cache (`src/lib/cache/`):**
Two layers: in-memory Map (fast) + AsyncStorage via indexeddb.ts (persisted).
- Use `cacheGet` / `cacheSet` / `cacheInvalidate` from `src/lib/cache/index.ts`
- Keys defined in `src/lib/cache/keys.ts` — TTLs: SHORT 1m, MEDIUM 5m, LONG 30m, DAY 24h
- Component data fetching: `cacheGet` first, fetch on miss, `cacheSet` the result (see `useRetentionMetrics`) — there is NO `useCachedQuery` hook in this codebase (audit 2026-07-05 confirmed zero references; don't invent it)

**Offline (`src/lib/db.ts`):**
AsyncStorage store for workout plans, days, exercises. Queue key: `fitnyx-db:offline-queue`. Replayed by AuthProvider on reconnect.

**Roam (`src/features/roam/`, screens `app/roam/`)** — GPS-tracked run / walk / ride:
- Background GPS task is defined in `tracking.ts`, imported at the top of `app/_layout.tsx` (must stay there — the OS delivers locations to a task defined at startup). Tracking only starts from the foreground, so only "While using the app" permission is requested; never add `ACCESS_BACKGROUND_LOCATION` (it triggers Google Play's background-location declaration).
- The in-progress recording is persisted in `recordingStore.ts` (chunked AsyncStorage, serialized writes), not React state.
- `geo.ts` mirrors the backend's `internal/activity/metrics.go` (thresholds, vehicle detection, splits). **Change both together**; the backend is authoritative for saved numbers and XP.
- Maps: MapLibre (`RouteMap.tsx`; `RouteMap.web.tsx` placeholder for the web export) with OpenFreeMap tiles — style URLs live only in `mapStyle.ts`.
- Replay (`replay.ts` pure timeline + `useReplayPlayer` + `RoamReplay`): uses the backend's `route_times` (seconds per route point; `[]` on Roams saved before 2026-10-12 → even pace). The line is a MapLibre `line-gradient` (source needs `lineMetrics`) coloured by speed (`routeRamp` theme colours) and revealed up to the playhead via transparent stops. Names: `name` is null unless the user changed it — the default ("Morning Run") is derived by `defaultActivityName()`, never stored.

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

`auth` · `dashboard` · `diet` · `home` · `onboarding` · `roam` · `workouts`

## UI primitives (`src/components/ui/`)

Button, Card, Input, Screen, PageHeader, ConfirmModal, Logo, LoopingLottie (decorative looping Lottie that pauses when its screen is unfocused — use it instead of `LottieView autoPlay loop`)

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

### TypeScript / Jest

- **Never use native dynamic `await import()` in src/** — jest throws `A dynamic import callback was invoked without --experimental-vm-modules` at runtime, silently breaking any code path that catches the error (e.g. fetchWithAuth's re-register). Use lazy `require('...') as typeof import('...')` instead (Metro handles it; jest executes it).
- **New `app/` routes fail `tsc --noEmit` with typed-routes errors until `.expo/types/router.d.ts` regenerates** — `expo export` does NOT regenerate it; run `npx expo start` briefly (or let the dev server run) after adding/removing route files. CI is unaffected (no `.expo/` = loose types).

### Android build (`expo run:android`)

- **`android/` is gitignored (prebuild-managed).** After cloning or if a build fails on stale native config, regenerate with `npx expo prebuild -p android --clean` so config plugins (`plugins/withNotifeeRepo.js`, `withNotifIcon.js`, `withFirebasePodfileFix.js`) re-apply. Never hand-edit `android/` — fix the config plugin instead.
- **`prebuild --clean` wipes `android/local.properties`** → build fails `SDK location not found`. Recreate it: `sdk.dir=/Users/taroshmathuria/Library/Android/sdk`. `ANDROID_HOME` is NOT set in the shell/profile; SDK lives at `~/Library/Android/sdk` (has platforms 35/36/36.1).
- **Notifee maven repo:** `expo run:android` passes `--configure-on-demand` + `org.gradle.parallel=true`, so notifee's own `rootProject.allprojects` repo injection runs too late → `Could not find app.notifee:core`. `plugins/withNotifeeRepo.js` must inject `maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }` into the app's `allprojects.repositories`. That plugin's gate must be `config.modResults.language === 'groovy'` (NOT `'gradle'`) — `withProjectBuildGradle` sets `language` to `'groovy'`/`'kt'`, never `'gradle'`, so the wrong value silently no-ops the plugin.

### iOS build (local `xcodebuild` / `expo run:ios`)

- **Local builds need `SENTRY_DISABLE_AUTO_UPLOAD=true`** (e.g. `SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild … build`, `… ./gradlew assembleRelease`) — the source-map/dSYM upload needs `SENTRY_AUTH_TOKEN`, which only EAS has (EAS secret). Org/project/region come from the `@sentry/react-native/expo` plugin options in app.json (`fitnyx` / `fitnyx-mobile` / `https://de.sentry.io/` — the org is in the EU region). Never put `SENTRY_DISABLE_AUTO_UPLOAD` back in eas.json's `preview`/`production` profiles: without the upload, production crash reports show minified JS and `<unknown>` native frames. `ios/` is gitignored (prebuild-managed), like `android/`.

### Native patches / Roam device testing

- **`patches/expo-task-manager+55.0.20.patch` (applied by `postinstall: patch-package`) backports the expo-task-manager 57 fix**: on 55.0.20, if a location event arrives before the React context exists (app killed mid-Roam, then reopened), the task manager is registered as "headless" and dropped after the first batch — every later GPS fix is queued forever and the Roam stops gaining distance. Remove the patch (and the `expo.autolinking.android.buildFromSource` entry) once the app is on SDK ≥ 57. When bumping expo-task-manager, regenerate or delete the patch — `patch-package` fails the install on a version mismatch.
- **Expo SDK 55 links most expo-* Android modules as prebuilt AARs** (shown as `[📦]` in `expo run:android` output), so editing their Java/Kotlin in `node_modules` does nothing. A patched module must be listed in `package.json` → `expo.autolinking.android.buildFromSource` (expo-task-manager also needs `unimodules-app-loader` there, or Gradle fails `Project with path ':unimodules-app-loader' could not be found`).
- **Never build the iOS simulator app with `CODE_SIGNING_ALLOWED=NO`** — it strips the application-identifier entitlement, so every Keychain write fails (`SecureStore setItem failed: A required entitlement isn't present`) and the Supabase session is lost on each relaunch. Build with signing left on (simulator builds sign ad hoc), e.g. `SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild -workspace ios/FitNyx.xcworkspace -scheme FitNyx -configuration Debug -sdk iphonesimulator build`, or `npx expo run:ios`. Not an app bug — EAS/device builds are signed.
- **Maestro `pressKey: Home` on iOS stops a running `xcrun simctl location … start` route**, which looks exactly like background GPS failing. To test Roam in the background, background the app with `xcrun simctl launch booted com.apple.Preferences` instead, and check `pointCount` in the app's `RCTAsyncLocalStorage_V1/manifest.json` (key `fitnyx-roam:recording`).
- **`app/login.tsx` / `app/signup.tsx` render the bare `AuthForm` (no `AuthLanding` header), so they must keep `Screen`'s safe-area top + side padding** — zeroing them (as before 2026-10-11) drew the form under the status bar whenever the route was opened directly (deep link, session-expired redirect). For Maestro, driving login through Welcome (`openLink: fitnyxmobile:///` → tap `" Log in"`) is still the most reliable path.

### Navigation (expo-router stack)

- **Never `router.replace('/x')` to "go back" to a screen that is already underneath** (e.g. `/roam` after discard/delete, `/workouts/select` after finishing a session). replace() only swaps the top screen, so the stack gets a second copy and back walks through duplicates like browser history. Use `router.dismissTo('/x')` (pops to it, or replaces if it isn't in the stack). Found 2026-10-11.
- **Bottom-nav tabs must reset the stack**: `if (router.canDismiss()) router.dismissAll(); router.replace(tab)` in `BottomNav.navigate`. With replace() alone, Home → Roam → Run → Workouts tab → back returned to the stale Roam.
- **System back (root `BackHandler` in `app/_layout.tsx`)**: pop if `canGoBack()`, else go to Home (`/`) from any other tab, and only Home asks "press back again to exit".
- **Verify navigation by walking real paths with back presses** (adb `input keyevent 4` + `uiautomator dump` to read the screen), including tab switches from deep inside a flow — opening screens by deep link alone never exercises the stack. Device px ≠ screenshot px: tab bar centres on a 1080-wide Pixel 7 are x≈116/327/540/751/963 (Home/Workouts/Coach/Stats/Settings), y≈2238.

### Keyboard (Android, edge-to-edge)

- **Android no longer resizes the window for the keyboard (edge-to-edge), so `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` does nothing on Android** — the keyboard covers the bottom of the form (found 2026-10-12: the auth screens' Log in / Create account button). Use `behavior="padding"` on both platforms, and don't pair a scrollable form with `keyboardDismissMode="on-drag"` on Android (scrolling to reach the button closed the keyboard).

- **Absolutely-positioned bottom bars (e.g. the Save bar on `app/profile.tsx` / `app/fitness-profile.tsx`) must pad by `insets.bottom`**, and the scroll content above them by the same amount. A fixed `Platform.OS === 'ios' ? 32 : 20` put Android's Save button under the 3-button navigation bar (found 2026-10-13).

### Notifications (notifee)

- **Never request an exact alarm without checking access.** On Android 12+, `AlarmType.SET_EXACT*` without the user-granted SCHEDULE_EXACT_ALARM makes notifee DROP the trigger ("Missing SCHEDULE_EXACT_ALARM permission. Trigger not scheduled") — it does not fall back. Use `canScheduleExactAlarms()` in `src/lib/reminders.ts` and fall back to `SET_AND_ALLOW_WHILE_IDLE` (found 2026-10-11: every reminder silently failed). Verify scheduling with `adb shell dumpsys alarm | grep fitnyx` and `adb logcat | grep -i notifee`, not just "no error thrown".

### React / providers

- **Never memoize a callback that calls a `useWorkout()` action (`finishActiveSession`, `abandonActiveSession`, `pauseActiveSession`, `resumeActiveSession`) without listing that action in the deps.** Those actions close over `activeSession` and are re-created when it changes; a screen that mounts before the provider has the session (e.g. right after `offlineStartSession` → `router.push`) captures the `activeSession = null` version and the action silently no-ops. Verified 2026-10-08 with a Jest probe against `app/workouts/session/[id].tsx` (`completeWorkout`/`abandonWorkout` memoized on `[sessionId]` only).

### Offline mode (audit 2026-10-12)

- **A network failure has no `status`; an HTTP error has one.** Branch on `(error as { status?: number }).status` — offline paths fall back to cache/queue, only real HTTP errors get logged or alerted. Never `console.error` a no-status error (it shows a red LogBox toast in dev for an expected offline state).
- **Never sign out on `AuthRetryableFetchError`.** Offline with an expired access token, Supabase's refresh fails retryably and keeps the session. `getAccessToken` (src/lib/api.ts) throws `NetworkUnavailableError` (no status) instead; AuthProvider boots offline from `getStoredUser()`. Treating it as "session dead" logged users out and wiped the offline queue.
- **`signOut()` calls `supabase.auth.signOut()` FIRST and wipes local data only if it succeeds.** Offline, Supabase's sign-out fails and keeps the session; wiping first deleted unsynced work while leaving the user signed in. Settings blocks sign-out offline.
- **Cache TTL = freshness, not lifetime.** `idbGet`/`cacheGet` return null when expired but never delete; `cacheGetStale`/`idbGetStale` return the last value regardless. Hydrate screens (and offline fallbacks) with `cacheGetStale`. Never `cacheInvalidate` an offline-relevant cache just to force a refetch — the screens refetch on focus anyway (record.tsx did this and emptied the offline Roam list).
- **Offline-created ids resolve through `resolveId()` (offlineStore).** When START_SESSION / LOG_SET sync, the session/set is re-keyed under its server id (`promoteOfflineSession` / `promoteOfflineLog`) and the offline→server mapping is KEPT (pruned only when nothing references it). Every `offlineApi` entry point resolves ids first — screens keep the offline id in their route/state after sync. Never `clearIdMappings()` when the queue empties (that stranded sets/finish of a session continued after reconnect: "not yet synced" forever).
- **Edit forms must not save what they couldn't load.** profile.tsx / fitness-profile.tsx fill from the cached copy offline and block saving while offline or when nothing loaded — otherwise a later save overwrote real data with blanks/defaults.
- **Don't render "empty"/"create" UI for data that just couldn't load offline** (diet wizard, "No exercises added", "No custom plans") — show an offline state instead.
- **Never call `supabase.auth.getSession()` on a path that must be fast while offline.** With an expired access token it retries the refresh with backoff for up to ~30 s (`AUTO_REFRESH_TICK_DURATION_MS`) before returning. Check `isDefinitelyOffline()` (src/lib/network.ts) first and read `getStoredSession()` instead — AuthProvider boot and `getAccessToken` do this; without it an offline cold start took ~1 min.
- **Device-testing offline on the emulator:** `adb shell svc wifi disable; adb shell svc data disable` (and `enable` to restore). The dev client loads Metro from 10.0.2.2, which goes away too — for an offline cold start run `adb reverse tcp:8081 tcp:8081` and open `exp+fitnyx-mobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`. If `uiautomator dump` exits 137 / "Killed", a Maestro driver holds UiAutomation: `adb shell am force-stop dev.mobile.maestro`. Delete `/sdcard/w.xml` before each dump, or a failed dump silently re-reads the previous screen.

### Auth / onboarding (2026-10-13)

- **Onboarding resumes at `resumeStepIndex(current_step)` — the backend's `current_step` IS the STEPS index** (1 = Username, 2 = DOB…). It used to subtract 1, so any remount right after saving a step reopened that step; with the username step this looped (each pass auto-picked a new "kapilNNNN" because the user's own name read as taken).
- **Exchange OAuth / email-link codes only via `exchangeCodeOnce()` (src/lib/authCode.ts).** On Android the Google/Facebook redirect reaches both AuthForm (openAuthSessionAsync) and the `/auth/callback` route; two `exchangeCodeForSession` calls on one code → the loser shows "PKCE code verifier not found in storage".
- **A Google/Facebook redirect can carry `error`/`error_description` instead of a code** (user tapped Cancel → `access_denied`; Facebook account without email → "Error getting user email…"). On Android that URL also opens `/auth/callback`, which must step back to the sign-in form (it shows the error via `oauthErrorMessage`) — it used to show a full-screen "Invalid callback link" (found 2026-10-13). Simulate with `adb shell am start -a android.intent.action.VIEW -d "'fitnyxmobile://auth/callback?error=access_denied&error_description=User+denied+access'"` while the provider tab is open.
- **Never render Home (or the bottom nav) for a signed-in user whose `onboardingComplete` is false.** Sign-in navigates to `/` and AuthProvider's redirect to `/onboarding` runs in an effect, i.e. after a frame — so `app/index.tsx` shows the spinner and `BottomNav` returns null until onboarding is complete (before 2026-10-13 a new Google sign-up saw Home + nav flash before the username step).
- **Backend username availability excludes the caller's own account** (`isUsernameTakenInDB(name, exceptUserID)`), and there is no Redis "taken" cache any more — it kept names a user had moved away from blocked for 24 h.
