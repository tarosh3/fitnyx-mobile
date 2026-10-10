---
name: debug-app
description: Debug FitNyx issues — Metro/device logs, Android logcat, backend request logs, network/auth failures, cache staleness, and native build errors. Use when investigating a bug, crash, or unexpected behavior anywhere in the stack.
---

# Debug FitNyx

## Where the logs are

| Layer | How to see logs |
|-------|----------------|
| JS (mobile) | Metro terminal from `npx expo start`; `console.log` appears there |
| Android native | `adb logcat | grep -iE 'fitnyx|ReactNative|notifee'` |
| iOS native | Xcode console, or `npx react-native log-ios` |
| Backend | stdout of `go run ./cmd/server` — structured JSON per request (`internal/middleware/request_logger.go`, health checks skipped) |
| Crashes (prod) | Sentry — mobile (`@sentry/react-native`) and backend (`SENTRY_DSN`) |

## Common failure classes

### "Network request failed" / API errors on mobile
1. Backend running? `curl http://localhost:8080/health`
2. Android emulator: `localhost` must remap to `10.0.2.2` — handled in `src/lib/config/backend.ts`. Physical device needs the machine's LAN IP or prod URL in `.env`.
3. `EXPO_PUBLIC_*` env is inlined at bundle time — after editing `.env`, restart Metro with `npx expo start -c`.
4. All API calls go through `fetchWithAuth()` (`src/lib/api.ts`) — put a temporary log there to see every request/status in one place.

### Auth issues (401s, unexpected sign-outs)
- Backend tries 3 JWT strategies: HS256 with `JWT_SECRET`, HS256 with base64-decoded secret, then Supabase JWKS. 401s on every request usually mean backend `JWT_SECRET` doesn't match the Supabase project.
- Single-device login is enforced: signing in elsewhere revokes the session (endpoints `/check-and-lock`, `/claim`, `/release`). Mobile handles revocation in `AuthProvider` — "random" sign-outs are usually this, not a bug.

### Stale data on screens
- Two cache layers: in-memory Map + AsyncStorage (`src/lib/cache/`). TTLs in `src/lib/cache/keys.ts` (SHORT 1m … DAY 24h).
- Check that mutations call `cacheInvalidate`/`cacheInvalidatePrefix` for affected keys — missing invalidation is the top cause of stale UI.
- Nuke from orbit during debugging: uninstall the app, or clear AsyncStorage keys (all prefixed `fitnyx-`).

### Offline queue weirdness
Failed mutations queue in AsyncStorage (`fitnyx-db:offline-queue`, `src/lib/db.ts`) and replay on reconnect (AuthProvider) and every 60s (SyncManager). Duplicate or delayed writes after connectivity loss usually trace here.

### AI coach not responding / slow
- Backend prefers Groq (`GROQ_API_KEY`, model `llama-3.3-70b-versatile`); falls back to NVIDIA NIM. Missing both keys → error "no GROQ_API_KEY or NVIDIA_API_KEY found".
- Rate limit: 10 req/min per user. Response cache: 10min TTL keyed on prompt hash — identical questions return cached answers.

### Android native build failures
See the `build-apk` skill's pitfalls section: regenerate with `npx expo prebuild -p android --clean`, recreate `android/local.properties` (`sdk.dir=/Users/taroshmathuria/Library/Android/sdk`), and fix config plugins in `plugins/` rather than editing `android/`.

## Useful debugging commands

```bash
npx expo start -c                          # Clear Metro cache (after env/babel changes)
adb reverse tcp:8080 tcp:8080              # Physical Android device → localhost backend
adb shell pm clear com.fitnyx.app          # Wipe app data (cache, AsyncStorage, session)
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/api/v1/users/me   # Test auth directly
```

Get a JWT for curl testing: log it temporarily from `fetchWithAuth()`, or use backend's `cmd/admin-token`.
