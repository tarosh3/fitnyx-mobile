---
name: release
description: Ship FitNyx — pre-release checks, backend deploy to Render, mobile EAS builds (preview APK / production AAB), and post-release verification. Use when asked to release, deploy, ship, or publish any part of the stack.
---

# Release FitNyx

## 1. Pre-release checks (all must be green)

```bash
# Mobile (mirrors .github/workflows/ci.yml)
npx tsc --noEmit && npm test -- --passWithNoTests && npx expo export --platform web

# Backend
cd /Users/taroshmathuria/FitNyx/backend && make test && make test-race

# Admin (if shipping admin changes)
cd /Users/taroshmathuria/Documents/AdminDashboard/admin && npm run lint && npm run build
```

Also confirm: no pending SQL migration unapplied to prod DB (see `db-migrate` skill), and no half-synced API shape between backend and mobile.

## 2. Backend → Render

- Prod URL: `https://fitnyx.onrender.com`. Deploys from the git repo (Dockerfile, multi-stage alpine, port 8080).
- Ship = merge/push the deployment branch; Render builds from Dockerfile. Verify local Docker build first if the Dockerfile changed: `docker build -t fitnyx-backend:latest .`
- **Order matters**: deploy backend BEFORE shipping a mobile build that depends on new endpoints — old apps must keep working (additive API changes only; never remove/rename a field mobile still reads).
- Post-deploy: `curl https://fitnyx.onrender.com/health`

## 3. Mobile → EAS

```bash
npx eas build -p android --profile preview      # Internal APK (testers), prod backend baked in
npx eas build -p android --profile production   # Play Store AAB, version autoIncrement
npx eas build -p ios --profile production       # App Store build
```

- Profiles in `eas.json` already bake prod env (`https://fitnyx.onrender.com`, Supabase keys). `EXPO_PUBLIC_*` is inlined at build time — env changes require a rebuild, not an OTA restart.
- Bundle ID `com.fitnyx.app`; production autoIncrements the version.
- Native config changed (plugins, app.json, eas.json, .gitignore, patches, new native dep)? A new build is mandatory — JS-only changes are the only thing OTA-able.

## 3b. Mobile → OTA update (JS / asset changes only)

```bash
node scripts/publish-update.js production "What changed" --dry-run   # build + check only
npm run update:production -- "What changed"                         # publish
npm run update:preview -- "What changed"                            # testers' APKs
```

- **Never run bare `eas update`** — it bundles with the local `.env` (localhost backend). The script uses the eas.json profile env and refuses to publish a bundle without the production backend URL.
- Reaches only builds with the same fingerprint (runtimeVersion). Users get it on the cold start after it downloads.
- Set `SENTRY_AUTH_TOKEN` in the shell to upload source maps; otherwise Sentry shows minified stacks for that update.
- Bad update? `npx eas update:republish` an earlier group to the channel, or `npx eas update:rollback`.
- Forced store update / maintenance / Home banner / feature flags: admin dashboard → App Config (backend `app_config`, live within ~1 min).

## 4. Admin

No deploy pipeline yet. Also note: the admin repo has essentially all work uncommitted on top of the initial commit — commit before any deploy setup.

## 5. Post-release verification

- Backend: `/health` returns OK; watch Render logs for startup errors; Sentry for new backend issues.
- Mobile: install the built APK on a device, sign in, hit one authed endpoint (dashboard loads = auth + API + DB all work).
- Sentry (mobile): confirm release shows up and no new crash cluster appears.
