# FitNyx Mobile App Review

Date: March 14, 2026  
Scope: Review-only audit of the mobile app codebase. No code was changed as part of this review.

## Summary

This app has real product ambition and a decent amount of surface area, but it is not premium-ready. It has feature depth, some useful testing, and a real attempt at caching/offline behavior, but the foundations are still weak in important areas:

- auth callback flow looks incomplete
- sensitive data is stored too loosely
- logout and user-switch privacy boundaries are unsafe
- offline sync can duplicate or lose user data
- dashboard trust is undermined by hardcoded values
- private route behavior is inconsistent
- there is already type/runtime contract drift in key workout flows

Static validation observed during review:

- `npx tsc --noEmit` fails on `/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx`
- `CI=1 npx jest --runInBand --watchman=false` passes with `11` suites and `122` tests

## 1. Critical

- **Title:** Auth callback and recovery flows are not wired end-to-end
  - **Category:** Critical
  - **Severity reason:** Sign-up verification, password reset, and OAuth callback handling appear structurally incomplete. These are core account flows.
  - **What exactly is wrong:** The auth form generates redirects to `fitnyxmobile://auth/callback` via [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/auth/AuthForm.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/auth/AuthForm.tsx), but Supabase URL detection is disabled in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts), and there is no `app/auth/callback.tsx` route or deep-link listener in the app root. The stack in [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/_layout.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/_layout.tsx) includes `update-password`, `email-verified`, and `verification-failed`, but nothing appears to route callback URLs into those screens.
  - **Why it matters in real usage:** Users can get stuck after email verification, password reset, or OAuth. That is an account-creation and recovery failure, not a polish issue.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/auth/AuthForm.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/auth/AuthForm.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/_layout.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/_layout.tsx), missing `app/auth/callback.tsx`
  - **Recommended fix direction (high level only):** Add a dedicated auth callback route, handle deep links explicitly, exchange/reset tokens there, and route to success/failure screens intentionally.
  - **Priority order if relevant:** 1

- **Title:** Sensitive auth and health data are stored in plain AsyncStorage
  - **Category:** Critical
  - **Severity reason:** This app stores both session state and personal health/workout data locally without secure storage.
  - **What exactly is wrong:** Supabase auth persistence uses `AsyncStorage` in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts). The custom backend session ID is also stored in `AsyncStorage` in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/auth.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/auth.ts). Offline workout sessions/logs are serialized into `AsyncStorage` in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts). `expo-secure-store` is installed but not used anywhere.
  - **Why it matters in real usage:** On a mobile fitness app, this means tokens, session identifiers, workout logs, and body data are easier to extract on compromised devices, backups, or debugging flows than they should be.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/supabase.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/auth.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/auth.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts)
  - **Recommended fix direction (high level only):** Move auth/session identifiers to secure storage, classify what health data must be encrypted at rest, and stop using plain AsyncStorage as the default persistence layer for sensitive records.
  - **Priority order if relevant:** 2

- **Title:** Cross-user data leakage is possible after logout, revocation, or device sharing
  - **Category:** Critical
  - **Severity reason:** This is a privacy breach class problem.
  - **What exactly is wrong:** Manual sign-out in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx) clears only the generic cache prefix and session ID. It does not clear offline workout state in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts) or legacy cached plan/day data in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts). Automatic sign-out on revoked session in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api.ts) removes the session ID and signs out, but does not clear cached user data at all. Diet plans are cached under a global key, not a user-scoped key, and the diet screen loads them without an auth guard.
  - **Why it matters in real usage:** A second user on the same device can see the previous user’s nutrition plan, offline workout state, and possibly other stale private data.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts)
  - **Recommended fix direction (high level only):** Make every cache user-scoped, clear all user-derived storage on every sign-out path, and enforce route-level auth on private screens.
  - **Priority order if relevant:** 3

- **Title:** AI coach history can leak across users in memory
  - **Category:** Critical
  - **Severity reason:** This exposes personal conversation history between accounts.
  - **What exactly is wrong:** The AI coach provider loads history once on mount in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AICoachProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AICoachProvider.tsx), stores it in local provider state, and never resets it when the authenticated user changes or signs out. It also does not reload history on new login.
  - **Why it matters in real usage:** User B can open the coach and see User A’s old messages if the app stays mounted across logout/login.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AICoachProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AICoachProvider.tsx)
  - **Recommended fix direction (high level only):** Bind AI state to the current auth user, clear it on sign-out/session change, and reload on sign-in.
  - **Priority order if relevant:** 4

- **Title:** Offline sync can both duplicate writes and silently lose user data
  - **Category:** Critical
  - **Severity reason:** This risks corrupted workout logs and dropped offline actions.
  - **What exactly is wrong:** `processOfflineQueue()` is triggered from both [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx) and [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/SyncManager.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/SyncManager.tsx), with no lock, mutex, or in-flight guard. At the same time, the sync engine removes failed mutations for almost every error case, not just hard validation failures.
  - **Why it matters in real usage:** The same offline mutation can be processed twice if two sync loops race, and transient server failures can permanently delete queued user actions. That is data corruption plus data loss.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/AuthProvider.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/SyncManager.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/SyncManager.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/syncEngine.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/syncEngine.ts)
  - **Recommended fix direction (high level only):** Add a single sync orchestrator with an execution lock, retry classes, backoff, and idempotency semantics for server-side mutations.
  - **Priority order if relevant:** 5

- **Title:** Workout session persistence can resurrect finished or stale sessions
  - **Category:** Critical
  - **Severity reason:** This can put users back into sessions that should be over.
  - **What exactly is wrong:** Online session start persists an active session into offline storage. But online pause/resume/finish/abandon return early to the server path and do not update or clear the local offline copy. The workout provider then falls back to that stale offline session when the server reports no active session.
  - **Why it matters in real usage:** Users can finish a workout, reopen the app, and see an “active” session come back from stale local state.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineApi.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineApi.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/WorkoutProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/WorkoutProvider.tsx)
  - **Recommended fix direction (high level only):** Make session state persistence authoritative, update local persistence on all session transitions, and clear active offline session IDs when server says the session ended.
  - **Priority order if relevant:** 6

- **Title:** The plan-details “continue workout” logic is currently broken and the app does not type-check
  - **Category:** Critical
  - **Severity reason:** There is a confirmed compile failure and likely a runtime flow bug.
  - **What exactly is wrong:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx) checks `activeSession.workout_day_id`, but the session type defines `day_id` in [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/workoutSessions.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/workoutSessions.ts). TypeScript fails on this. Even at runtime, this condition will not match if the API shape is `day_id`, so the UI can mislabel the session state and block continuation.
  - **Why it matters in real usage:** Users may be told “SESSION ALREADY ACTIVE” without being able to continue the right session from the plan screen.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/workoutSessions.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/api/workoutSessions.ts)
  - **Recommended fix direction (high level only):** Realign the type model and all consumers to the actual backend contract, then run type-checking as a required gate.
  - **Priority order if relevant:** 7

- **Title:** Account deletion is not actually implemented
  - **Category:** Critical
  - **Severity reason:** This is a compliance and store-review risk, not just a missing feature.
  - **What exactly is wrong:** The delete-account screen only opens Facebook settings or pre-fills an email to support. There is no actual in-app account deletion flow.
  - **Why it matters in real usage:** This is below user expectations and can trigger app-store rejection for apps that allow account creation but do not support in-app account deletion.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/delete-account.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/delete-account.tsx)
  - **Recommended fix direction (high level only):** Implement a real authenticated deletion flow with confirmation, revocation, server-side deletion request handling, and local purge.
  - **Priority order if relevant:** 8

## 2. Medium

- **Title:** The dashboard is still serving fake numbers and hardcoded product copy
  - **Category:** Medium
  - **Severity reason:** It damages trust immediately, especially in a fitness app.
  - **What exactly is wrong:** The main dashboard component passes fixed values `79.0`, `24.4`, and `180.0` into the stats card. The home header also hardcodes “GOOD EVENING” and canned mission text.
  - **Why it matters in real usage:** Health and progress data must be trustworthy. Hardcoded placeholders are prototype behavior, not production behavior.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/DashboardStats.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/DashboardStats.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/ProfileHeader.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/ProfileHeader.tsx)
  - **Recommended fix direction (high level only):** Source all displayed stats and hero copy from real query data, and explicitly distinguish placeholders or skeletons from final content.
  - **Priority order if relevant:** Very high

- **Title:** Request fan-out is expensive and redundant
  - **Category:** Medium
  - **Severity reason:** It will make the app feel heavier and scale worse as usage grows.
  - **What exactly is wrong:** The retention metrics hook calls sessions, plans, active session, insight, then plan days, then day exercises. Activity data separately calls sessions again. The workout provider also polls active session every 30 seconds. This is fragmented data fetching, not a coordinated data layer.
  - **Why it matters in real usage:** Cold-start network traffic is heavier than it needs to be, dashboard freshness is inconsistent, and backend load will rise unnecessarily.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useRetentionMetrics.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useRetentionMetrics.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useActivityData.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useActivityData.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/WorkoutProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/WorkoutProvider.tsx)
  - **Recommended fix direction (high level only):** Consolidate dashboard and home queries, derive activity data from cached session history, and reuse provider state for active session instead of refetching it from multiple places.
  - **Priority order if relevant:** High

- **Title:** Navigation is implemented like a stack, not like tabs
  - **Category:** Medium
  - **Severity reason:** This creates an unpremium, confusing back-stack experience.
  - **What exactly is wrong:** Bottom navigation uses `router.push()` for tab changes. That means every tab tap adds stack depth. The app also has duplicate “dashboard” concepts: `/` renders one home implementation, `/dashboard` renders another, and there is an unused third dashboard implementation in the codebase.
  - **Why it matters in real usage:** Back navigation becomes unpredictable and the product surface drifts because there is no single source of truth for primary navigation.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/navigation/BottomNav.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/navigation/BottomNav.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/index.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/index.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/DashboardOverview.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/DashboardOverview.tsx)
  - **Recommended fix direction (high level only):** Move to real tab navigation or tab-like replace/reset semantics, and collapse duplicate dashboard implementations into one owned flow.
  - **Priority order if relevant:** High

- **Title:** Private route protection is inconsistent, and some screens break badly when unauthenticated
  - **Category:** Medium
  - **Severity reason:** Direct deep links and stale nav states will fail unpredictably.
  - **What exactly is wrong:** Only a subset of screens explicitly redirect on missing user. For example, `/dashboard` guards auth, but several other private screens do not. One exercise flow exits early when there is no user and leaves loading stuck true.
  - **Why it matters in real usage:** Users can land on broken spinners, raw errors, or stale cached data when auth state is missing or late.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/exercises.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/exercises.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx)
  - **Recommended fix direction (high level only):** Add consistent route guards for all private screens and define an explicit unauthenticated fallback for each.
  - **Priority order if relevant:** High

- **Title:** `ExerciseMedia` breaks the rules of hooks
  - **Category:** Medium
  - **Severity reason:** This can cause unstable rendering or hard-to-reproduce hook-order bugs.
  - **What exactly is wrong:** `useVideoPlayer()` is called conditionally inside `if (isVideo)`. If the same component instance ever switches between image and video modes, hook order changes.
  - **Why it matters in real usage:** Media-heavy screens can become fragile, especially as cached or local URLs resolve asynchronously and media types vary.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/workouts/ExerciseMedia.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/workouts/ExerciseMedia.tsx)
  - **Recommended fix direction (high level only):** Separate image and video renderers or ensure hooks are called unconditionally in stable order.
  - **Priority order if relevant:** Medium-high

- **Title:** Cache architecture is fragmented and stale behavior is unreliable
  - **Category:** Medium
  - **Severity reason:** This is already causing duplication and will keep causing stale-data bugs.
  - **What exactly is wrong:** The app uses React Query, a custom memory plus AsyncStorage cache, a legacy offline DB store, and a separate offline mutation queue. The persisted cache path resets freshness timestamps when loading from storage, so stale-while-revalidate behavior is not truly preserved across restarts. There is also no coherent invalidation strategy after mutations.
  - **Why it matters in real usage:** Users will see stale home and dashboard data, and the team will keep patching symptoms instead of owning a single cache model.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useCachedQuery.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/hooks/useCachedQuery.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/cache/cache.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/cache/cache.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/QueryProvider.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/providers/QueryProvider.tsx)
  - **Recommended fix direction (high level only):** Standardize around one query/cache strategy for online reads, and one queue/store strategy for offline writes.
  - **Priority order if relevant:** Medium-high

- **Title:** Loading, retry, and failure handling are below production quality
  - **Category:** Medium
  - **Severity reason:** The app often fails passively instead of helping the user recover.
  - **What exactly is wrong:** Many screens only log errors and keep going, or show a spinner without retry. There are very few retry buttons and almost no screen-level recovery states.
  - **Why it matters in real usage:** Weak network, backend latency, or transient server errors turn into dead ends instead of recoverable moments.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/history.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/history.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/onboarding/OnboardingFlow.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/onboarding/OnboardingFlow.tsx)
  - **Recommended fix direction (high level only):** Add explicit retry actions, distinguish empty, error, and loading states, and normalize network errors in the API layer.
  - **Priority order if relevant:** Medium-high

- **Title:** Notification flow is incomplete and the settings UI is misleading
  - **Category:** Medium
  - **Severity reason:** The app suggests functionality it does not actually own.
  - **What exactly is wrong:** There is a notifications toggle in settings that only updates local component state. There is no full permission request flow or persistence for that setting.
  - **Why it matters in real usage:** Users think they are controlling notifications, but the setting is effectively fake.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/workoutNotification.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/workoutNotification.ts)
  - **Recommended fix direction (high level only):** Implement real notification permissions, persistence, and feature wiring, or remove the toggle until it is real.
  - **Priority order if relevant:** Medium

- **Title:** The app still contains route drift and dead or incorrect paths
  - **Category:** Medium
  - **Severity reason:** This is how teams end up shipping “works on one screen, breaks on another.”
  - **What exactly is wrong:** One dashboard implementation points “Workout List” to `/dashboard/exercises`, but that route does not exist. That component also overlaps conceptually with two other dashboard implementations.
  - **Why it matters in real usage:** This is architectural drift. Even when one route works, another path or old component is ready to break the moment someone wires it back in.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/DashboardOverview.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/DashboardOverview.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/QuickActionsGrid.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/QuickActionsGrid.tsx)
  - **Recommended fix direction (high level only):** Remove dead alternatives, consolidate route ownership, and make route constants central.
  - **Priority order if relevant:** Medium

- **Title:** Profile and account edits rely too much on optimistic trust and public asset exposure
  - **Category:** Medium
  - **Severity reason:** This is a privacy and data-quality concern.
  - **What exactly is wrong:** Profile fields have minimal client validation, avatar uploads are stored via public URLs, and old images are not cleaned up.
  - **Why it matters in real usage:** You can end up with invalid profile data, public avatar URLs that are broadly accessible, and storage bloat over time.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/profile.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/profile.tsx)
  - **Recommended fix direction (high level only):** Validate profile fields properly, use controlled storage access patterns, and add lifecycle cleanup for replaced assets.
  - **Priority order if relevant:** Medium

## 3. Good to have

- **Title:** Accessibility coverage is far below premium-app expectations
  - **Category:** Good to have
  - **Severity reason:** This hurts usability and inclusiveness, but it is not the most urgent production blocker.
  - **What exactly is wrong:** There are many icon-only `Pressable` elements without accessibility labels or roles. This is visible across navigation, headers, AI chat, settings, and workout controls.
  - **Why it matters in real usage:** Screen reader users and motor-impaired users will have a much worse experience than they should.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/navigation/BottomNav.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/navigation/BottomNav.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ui/PageHeader.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ui/PageHeader.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ai/AICoachChat.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ai/AICoachChat.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/settings.tsx)
  - **Recommended fix direction (high level only):** Add labels, roles, hit targets, focus order, and dynamic type checks across the app.
  - **Priority order if relevant:** Lower than the privacy and correctness issues

- **Title:** Search and list flows do not cancel stale requests
  - **Category:** Good to have
  - **Severity reason:** This creates jittery or stale UI under fast typing or flaky networks.
  - **What exactly is wrong:** Search debouncing exists, but there is no visible request cancellation or stale-response suppression in exercise search flows.
  - **Why it matters in real usage:** Old responses can win the race and overwrite newer intent, especially on slow networks.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/exercises.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/exercises.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/workouts/ExerciseSelector.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/workouts/ExerciseSelector.tsx)
  - **Recommended fix direction (high level only):** Use cancellable queries or request IDs and ignore outdated results.
  - **Priority order if relevant:** Moderate

- **Title:** Perceived-performance polish is still spinner-heavy
  - **Category:** Good to have
  - **Severity reason:** It makes the app feel cheaper than it needs to.
  - **What exactly is wrong:** Most heavy screens use full-screen spinners rather than skeletons or placeholder layouts.
  - **Why it matters in real usage:** Even normal latency feels slower when the UI disappears instead of progressively rendering.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/index.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/index.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/index.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/dashboard/diet.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/history.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/history.tsx)
  - **Recommended fix direction (high level only):** Add skeleton states for dashboard, plans, metrics, history, and exercise lists.
  - **Priority order if relevant:** Moderate

- **Title:** The screen and layout system is forcing padding hacks
  - **Category:** Good to have
  - **Severity reason:** This hurts consistency and keeps creating UI regressions.
  - **What exactly is wrong:** The shared screen wrapper always applies fixed top and bottom padding, while many screens then add their own spacer views to compensate.
  - **Why it matters in real usage:** Layouts become brittle and every new screen has to fight the container instead of using it.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ui/Screen.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/components/ui/Screen.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileHome.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileHome.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/MobileDashboard.tsx)
  - **Recommended fix direction (high level only):** Make screen chrome explicit rather than universal, and remove hardcoded spacer compensation.
  - **Priority order if relevant:** Moderate

- **Title:** Achievements and some “premium” surfaces are still static props, not product features
  - **Category:** Good to have
  - **Severity reason:** This is not a blocker, but it makes the app feel staged.
  - **What exactly is wrong:** Achievements are hardcoded, dashboard copy is partly hardcoded, and some “insight” surfaces feel decorative rather than authoritative.
  - **Why it matters in real usage:** Users notice when motivational surfaces are not grounded in their actual behavior.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/achievements.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/achievements.tsx), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/ProfileHeader.tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/features/dashboard/components/ProfileHeader.tsx)
  - **Recommended fix direction (high level only):** Tie achievements, streak copy, and mission copy to actual user events and backend-calculated state.
  - **Priority order if relevant:** Moderate

- **Title:** Developer-experience guardrails are too thin
  - **Category:** Good to have
  - **Severity reason:** This increases the chance of regression, drift, and broken releases.
  - **What exactly is wrong:** There is no lint script in `package.json`, there is heavy use of `any`, and tests cover utilities and components more than critical user flows. TypeScript is already failing on one runtime-relevant mismatch.
  - **Why it matters in real usage:** Teams ship what the repo allows. Right now the repo allows drift too easily.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/package.json`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/package.json), [`/Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/app/workouts/plans/[id].tsx)
  - **Recommended fix direction (high level only):** Add linting, stricter CI gates, and feature-level tests around auth, onboarding, workout session, and offline sync.
  - **Priority order if relevant:** Moderate

## 4. Can be implemented in future

- **Title:** Add serious observability: crash reporting, API failure telemetry, and product analytics
  - **Category:** Can be implemented in future
  - **Severity reason:** Not required for functionality, but required for operating the app like a real product.
  - **What exactly is wrong:** There is no visible crash reporting, no backend or API tracing, and no product analytics instrumentation.
  - **Why it matters in real usage:** Once the app is in the wild, you will be blind to failures, drop-off points, and performance regressions.
  - **Where it exists:** Product-wide gap
  - **Recommended fix direction (high level only):** Add crash and error reporting first, then lightweight product analytics around auth, onboarding, dashboard, workout start/finish, and diet generation.
  - **Priority order if relevant:** After critical correctness and privacy issues

- **Title:** Move offline state to a real local database with idempotent sync contracts
  - **Category:** Can be implemented in future
  - **Severity reason:** This is the right long-term fix for the current offline ambitions.
  - **What exactly is wrong:** Offline data is spread across raw AsyncStorage JSON blobs, legacy cache stores, and mutation queues.
  - **Why it matters in real usage:** As the data model grows, the current approach will become harder to debug, migrate, and protect from corruption.
  - **Where it exists:** [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/offline/offlineStore.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/db.ts), [`/Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/cache/indexeddb.ts`](file:///Users/taroshmathuria/Documents/fitnyx-mobile/src/lib/cache/indexeddb.ts)
  - **Recommended fix direction (high level only):** Move to SQLite or another structured mobile store, with operation IDs, retries, and conflict rules.
  - **Priority order if relevant:** After immediate offline correctness fixes

- **Title:** Add stronger mobile transport protections if your threat model requires them
  - **Category:** Can be implemented in future
  - **Severity reason:** Not every app needs certificate pinning, but a health and fitness app may eventually justify it.
  - **What exactly is wrong:** There is no visible certificate pinning or transport hardening beyond standard HTTPS assumptions.
  - **Why it matters in real usage:** If you later target higher-trust environments or enterprise partnerships, this gap will matter.
  - **Where it exists:** Product-wide gap
  - **Recommended fix direction (high level only):** Revisit after fixing secure local storage and auth flow fundamentals.
  - **Priority order if relevant:** Later

- **Title:** Add a real update and release strategy
  - **Category:** Can be implemented in future
  - **Severity reason:** Not immediately blocking, but necessary for stable long-term operations.
  - **What exactly is wrong:** There is no visible EAS config, no clear release channels, no forced-update logic, and no compatibility strategy.
  - **Why it matters in real usage:** Once backend contracts move, older clients will break without a plan.
  - **Where it exists:** Product-wide gap
  - **Recommended fix direction (high level only):** Define release channels, minimum supported versions, and a migration and compatibility policy.
  - **Priority order if relevant:** Later

- **Title:** Expand engagement systems only after trust systems are fixed
  - **Category:** Can be implemented in future
  - **Severity reason:** The product has the surface area for premium engagement but not the foundation yet.
  - **What exactly is wrong:** There is no meaningful push strategy, habit reminders, recovery reminders, milestone nudges, or reactivation logic beyond local UI surfaces.
  - **Why it matters in real usage:** Premium fitness apps retain users through reliable, timely engagement, not just beautiful screens.
  - **Where it exists:** Product-wide gap
  - **Recommended fix direction (high level only):** Build this after auth, accuracy, privacy, and analytics are trustworthy.
  - **Priority order if relevant:** Later

- **Title:** Introduce stronger modular boundaries by domain
  - **Category:** Can be implemented in future
  - **Severity reason:** The current structure works for now, but scale will make it painful.
  - **What exactly is wrong:** The app has overlapping dashboard implementations, multiple cache systems, and feature logic spread between routes, providers, hooks, and legacy helpers.
  - **Why it matters in real usage:** Every new feature increases the chance of touching the wrong layer and duplicating logic.
  - **Where it exists:** Product-wide architectural pattern
  - **Recommended fix direction (high level only):** Organize by domain with clear ownership for route, state, data access, and offline behavior.
  - **Priority order if relevant:** Later

## Top 10 Highest Priority Issues Overall

1. Auth callback and deep-link flow is incomplete.
2. Sensitive auth and health data are stored in plain AsyncStorage.
3. Cross-user leakage via incomplete logout and cache clearing.
4. AI coach history can persist across user changes.
5. Offline sync can duplicate writes and drop failed mutations permanently.
6. Stale workout sessions can be resurrected from local persistence.
7. The app currently fails TypeScript on a real session-field mismatch.
8. Delete-account flow is not a real delete flow.
9. Dashboard trust is undermined by hardcoded body stats and canned copy.
10. Request architecture is fragmented and redundantly expensive.

## Quick Wins

1. Fix the `workout_day_id` vs `day_id` mismatch in the plan-details flow and make `tsc` a required gate.
2. User-scope the diet-plan cache and clear all offline and user storage on every sign-out path, including revoked-session sign-outs.
3. Clear AI coach memory on auth change and reload history on sign-in.
4. Replace hardcoded dashboard metrics and copy with real query-backed values immediately.
5. Switch bottom-nav route changes from `push` semantics to real tab or reset semantics.
6. Add explicit private-route guards to all authenticated screens.
7. Add a real auth callback route and deep-link handling before shipping sign-up, reset, or OAuth flows.

## Hidden Risks

1. Cold-start session registration is not guaranteed. The auth provider skips registration during init, and the auth listener only appears to handle `SIGNED_IN` and `TOKEN_REFRESHED`, not an initial session event.
2. Offline writes are not idempotent. If sync runs twice, set logging and metrics can duplicate on the server.
3. Revoked-session sign-out does not purge user data. That makes account switching riskier than a normal logout flow.
4. XP and level calculations are not trustworthy if XP is granted for all sessions rather than only completed ones.
5. The app has enough duplicated code paths that fixing one dashboard or auth surface can break another.

## Premium-App Gap Analysis

### 1. Trust and correctness

Top-tier fitness apps do not show fake body stats, fake greeting logic, or stale personal data. This app still does.

### 2. Privacy and account maturity

Premium apps encrypt local secrets, scope cached user data carefully, and support real account deletion. This app does not do those things well enough yet.

### 3. Resilience

Premium apps degrade gracefully on poor networks, retry safely, and never silently drop offline user actions. This app is trying to support offline use, but the sync model is not safe enough yet.

### 4. Navigation quality

Premium apps feel structurally coherent. This app still behaves like a stack of screens with overlay navigation rather than a deliberate mobile information architecture.

### 5. Perceived performance

Premium apps hide latency with skeletons, optimistic updates, prefetching, and stable caches. This app still leans heavily on spinners and duplicate fetches.

### 6. Observability and release discipline

Premium apps have crash reporting, analytics, version strategy, and CI gates. This app has some tests, which is good, but not enough operational maturity.

### 7. Accessibility

Premium apps are usable beyond sighted, ideal-device users. This app is not there yet.

## Final Verdict

**Prototype-level**

That is not because the app is small. It is not small. It has real scope, real feature ambition, a test suite, React Query, and an attempt at offline capability.

But it is not premium-ready because:

- auth callback flow appears structurally incomplete
- local storage of sensitive data is weak
- logout and user-switch privacy boundaries are unsafe
- offline sync can lose or duplicate data
- dashboard trust is undermined by hardcoded values
- private route behavior is inconsistent
- the codebase already has type and runtime drift

If the question is whether this can be demoed, the answer is yes.

If the question is whether this should be shipped as a polished premium app in its current state, the answer is no.
