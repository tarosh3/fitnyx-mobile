---
name: build-apk
description: Build an installable Android APK for FitNyx — either locally via Gradle or in the cloud via EAS. Use when asked to build an APK, make a release build, or produce an installable Android build.
---

# Build an Android APK

Two paths. EAS preview is the low-friction default; local Gradle is faster to iterate and needs no EAS account/queue.

## Path A — EAS cloud build (recommended)

```bash
npx eas build -p android --profile preview
```

- `preview` profile in `eas.json` builds an **APK** (`"buildType": "apk"`), internal distribution, with **production backend env baked in** (`https://fitnyx.onrender.com` + Supabase keys). No local env setup needed.
- `production` profile builds an AAB for Play Store with `autoIncrement`.
- Requires `eas login` (Expo account). Build link + APK download printed when done.

## Path B — Local Gradle release APK

```bash
# 1. Regenerate native project (config plugins re-apply)
npx expo prebuild -p android --clean

# 2. prebuild --clean wipes local.properties — recreate it (REQUIRED)
echo "sdk.dir=/Users/taroshmathuria/Library/Android/sdk" > android/local.properties

# 3. Build release APK
cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`
Install: `adb install -r android/app/build/outputs/apk/release/app-release.apk`

### Env warning (local builds)
`EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time from `.env`. A local release APK built with the default `.env` points at `http://localhost:8080` — useless on a real phone. Before building for a device, set prod values in `.env` (or export them in the shell):

```
EXPO_PUBLIC_BACKEND_URL=https://fitnyx.onrender.com
EXPO_PUBLIC_API_URL=https://fitnyx.onrender.com/api/v1
```

Restore localhost values afterwards.

### Known pitfalls (from Mistakes log)
- `SDK location not found` → step 2 was skipped; recreate `android/local.properties`. `ANDROID_HOME` is not set in the shell.
- `Could not find app.notifee:core` → `plugins/withNotifeeRepo.js` didn't apply. Its gate must be `config.modResults.language === 'groovy'` (never `'gradle'`). Re-run prebuild after fixing the plugin.
- Never hand-edit `android/` — it's gitignored and regenerated; fix `plugins/*.js` instead.
- Bundle ID is `com.fitnyx.app` (set in `app.json`); Live Activity extension: `com.fitnyx.app.LiveActivity`.
