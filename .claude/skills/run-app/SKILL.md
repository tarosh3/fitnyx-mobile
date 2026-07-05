---
name: run-app
description: Run the FitNyx stack locally — mobile app (Expo dev server, iOS simulator, Android emulator), Go backend, and admin dashboard. Use when asked to run, start, or launch the app or any part of the stack.
---

# Run the FitNyx stack

## Mobile app (this repo)

```bash
npx expo start            # Metro dev server (press i for iOS, a for Android)
npx expo run:ios          # Build + run on iOS simulator
npx expo run:android      # Build + run on Android emulator
```

- The app uses `expo-dev-client`, so `expo start` alone only works if a dev build is already installed on the device/simulator. First run on a fresh simulator needs `expo run:ios` / `expo run:android`.
- Env comes from `.env` (`EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Default backend: `http://localhost:8080`.
- Android emulator: `localhost` auto-remaps to `10.0.2.2` in `src/lib/config/backend.ts` — do not hardcode it.

### Android build prerequisites (from Mistakes log)
- `android/` is gitignored and prebuild-managed. If native build fails on stale config: `npx expo prebuild -p android --clean`, then recreate `android/local.properties` with `sdk.dir=/Users/taroshmathuria/Library/Android/sdk` (prebuild --clean wipes it; `ANDROID_HOME` is not set in the shell).
- Never hand-edit `android/` — fix the config plugin in `plugins/` instead (`withNotifeeRepo.js`, `withNotifIcon.js`, `withFirebasePodfileFix.js`).

## Backend (Go)

```bash
cd /Users/taroshmathuria/FitNyx/backend
go run ./cmd/server       # Port 8080; loads .env via godotenv
```

Health check: `curl http://localhost:8080/health`. Key env in `.env`: `DB_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_KEY` (preferred LLM), `NVIDIA_API_KEY` (fallback), `REDIS_URL` (optional), `CORS_ORIGINS`.

## Admin dashboard

```bash
cd /Users/taroshmathuria/Documents/AdminDashboard/admin
npm run dev               # http://localhost:3000
```

Needs `DATABASE_URL` (same Supabase DB as backend), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`. After Prisma schema changes: `npx prisma db push` then `npx prisma generate` (client outputs to `src/generated/prisma`; never `prisma migrate`).

## Full-stack dev session

1. Start backend first (`go run ./cmd/server`).
2. Confirm mobile `.env` points at `http://localhost:8080`.
3. `npx expo start` (or `run:ios` / `run:android` for a fresh build).
